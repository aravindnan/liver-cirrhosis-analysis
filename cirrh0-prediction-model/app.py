"""Cirrh0 ML service.

Three jobs, kept separate:
  /predict  deterministic CatBoost stage estimate, plus an optional LLM explanation
  /extract  lab-value extraction from uploaded PDF reports
  /image    object detection on an uploaded slide image, plus an optional LLM explanation

The number returned as `stage` always comes from the model. The LLM only writes text,
its output is parsed as JSON (never evaluated) and every field is validated.
"""
import hmac
import io
import json
import logging
import math
import os
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import joblib
import numpy as np
import pdfplumber
import requests
from flask import Flask, jsonify, request

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cirrh0-ml")

# --- configuration (all secrets come from the environment) -------------------
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL_ID = os.environ.get("ROBOFLOW_MODEL_ID", "liver-yolo/1")
SERVICE_TOKEN = os.environ.get("ML_SERVICE_TOKEN", "")
UPLOAD_HOSTS = {
    h.strip().lower()
    for h in os.environ.get("UPLOAD_HOSTS", "res.cloudinary.com").split(",")
    if h.strip()
}
MAX_FILES = 10
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024
DOWNLOAD_TIMEOUT_S = 20

BASE_DIR = Path(__file__).resolve().parent  # artifacts load the same way from any working directory
model = joblib.load(BASE_DIR / "model.pkl")
scaler = joblib.load(BASE_DIR / "scaler.bin")
with open(BASE_DIR / "model_card.json") as _f:
    MODEL_CARD = json.load(_f)  # feature order, version and evaluation, written by train_model.py

# model_card feature name -> request field. The row is built in the card's order, so the training
# script is the single source of truth for column order.
FEATURE_FIELDS = {
    "Age": "age", "Sex": "sex", "Ascites": "ascites", "Hepatomegaly": "hepatomegaly",
    "Spiders": "spiders", "Edema": "edema", "Bilirubin": "bilirubin", "Cholesterol": "cholesterol",
    "Albumin": "albumin", "Copper": "copper", "Alk_Phos": "alk_phos", "SGOT": "sgot",
    "Tryglicerides": "tryglycerides", "Platelets": "platelets", "Prothrombin": "prothrombin",
}
assert set(MODEL_CARD["features"]) == set(FEATURE_FIELDS), "model_card features do not match app.py"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 256 * 1024


@app.before_request
def require_service_token():
    """When ML_SERVICE_TOKEN is set, only callers that know it (the API) may use the service."""
    if not SERVICE_TOKEN or request.path == "/":
        return None
    supplied = request.headers.get("X-Service-Token", "")
    if not hmac.compare_digest(supplied, SERVICE_TOKEN):
        return jsonify({"error": "Unauthorized"}), 401
    return None


@app.route("/")
def home():
    return "Liver Prediction API is running."


# --- LLM helpers --------------------------------------------------------------
_gemini = None


def gemini():
    global _gemini
    if _gemini is None:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set")
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        _gemini = genai.GenerativeModel(GEMINI_MODEL)
    return _gemini


def parse_json_object(text):
    """Parse a JSON object from model output. Never evaluates the text."""
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object in model output")
    data = json.loads(text[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("model output is not a JSON object")
    return data


def _text(value, limit=2000):
    return value.strip()[:limit] if isinstance(value, str) else ""


def _list(value, max_items=8, limit=300):
    if not isinstance(value, list):
        return []
    return [_text(v, limit) for v in value[:max_items] if isinstance(v, str) and v.strip()]


def sanitize_narrative(data, list_keys):
    out = {"analysis": _text(data.get("analysis"))}
    for key in list_keys:
        out[key] = _list(data.get(key))
    return out


def narrate(prompt, list_keys):
    """Return (narrative, ok). A failed LLM call never fails the prediction itself."""
    try:
        response = gemini().generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.3},
            request_options={"timeout": 30},
        )
        return sanitize_narrative(parse_json_object(response.text), list_keys), True
    except Exception:
        log.exception("narrative generation failed")
        empty = {"analysis": ""}
        empty.update({key: [] for key in list_keys})
        return empty, False


SAFETY_RULES = (
    "Write for a patient, in plain language, as general education only. "
    "Do not diagnose, do not name or dose medicines, and do not tell the reader to stop or change "
    "any treatment. Advise discussing results with a doctor. "
    "Respond with a single JSON object and nothing else."
)

# --- /predict -----------------------------------------------------------------
NUMERIC_FIELDS = {
    "age": (1, 120),
    "bilirubin": (0, 100),
    "cholesterol": (0, 2000),
    "albumin": (0, 10),
    "copper": (0, 1000),
    "alk_phos": (0, 20000),
    "sgot": (0, 5000),
    "tryglycerides": (0, 5000),
    "platelets": (0, 2000),
    "prothrombin": (0, 100),
}
SEX_CODES = {"female": 0.0, "male": 1.0, "other": -1.0}
YES_NO = {"N": 0.0, "Y": 1.0}
EDEMA_CODES = {"N": 0.0, "S": -1.0, "Y": 1.0}  # same encoding the model was trained with


def parse_prediction_input(data):
    """Return (features dict, error). Rejects missing, non-numeric and out-of-range values."""
    if not isinstance(data, dict):
        return None, "JSON body required"
    features = {}
    for field, (low, high) in NUMERIC_FIELDS.items():
        raw = data.get(field)
        if isinstance(raw, bool) or raw is None or raw == "":
            return None, f"{field} is required"
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return None, f"{field} must be a number"
        if not math.isfinite(value) or not low <= value <= high:
            return None, f"{field} must be between {low} and {high}"
        features[field] = value
    for field in ("ascites", "hepatomegaly", "spiders"):
        if data.get(field) not in YES_NO:
            return None, f"{field} must be Y or N"
        features[field] = YES_NO[data[field]]
    if data.get("edema") not in EDEMA_CODES:
        return None, "edema must be Y, S or N"
    features["edema"] = EDEMA_CODES[data["edema"]]
    if data.get("sex") not in SEX_CODES:
        return None, "sex must be male, female or other"
    features["sex"] = SEX_CODES[data["sex"]]
    return features, None


def stage_label(stage):
    return f"Estimated histologic stage {stage} of 4 (4 is the most advanced)"


@app.route("/predict", methods=["POST"])
def predict():
    features, error = parse_prediction_input(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400

    row = [[features[FEATURE_FIELDS[name]] for name in MODEL_CARD["features"]]]
    scaled = scaler.transform(row)
    # CatBoost multiclass returns shape (n, 1); flatten before taking the scalar.
    stage = int(np.asarray(model.predict(scaled)).ravel()[0])
    probabilities = {
        str(int(c)): round(float(p), 4) for c, p in zip(model.classes_, model.predict_proba(scaled)[0])
    }

    prompt = (
        f"{SAFETY_RULES}\n"
        f"A research model trained on primary biliary cholangitis trial data estimated histologic "
        f"stage {stage} of 4 for this person (4 is most advanced). It is not a diagnosis. "
        'Return JSON with exactly these keys: "analysis" (a short explanation of what this '
        'estimate means and its limits), "lifestyle_recommendations" (list of strings), '
        '"precautions" (list of strings), "self_treatment_plan" (list of general self-care '
        'tips, no medicines), "doctor_type" (list of medical specialties to consult).'
    )
    narrative, narrative_ok = narrate(
        prompt, ["lifestyle_recommendations", "precautions", "self_treatment_plan", "doctor_type"]
    )

    return jsonify(
        {
            "stage": stage,
            "stage_label": stage_label(stage),
            "probabilities": probabilities,
            "model_version": MODEL_CARD["model_version"],
            "narrative_available": narrative_ok,
            **narrative,
        }
    )


# --- safe downloads -----------------------------------------------------------
def is_allowed_url(url):
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    try:
        port = parsed.port
    except ValueError:
        return False
    return (
        parsed.scheme == "https"
        and (parsed.hostname or "").lower() in UPLOAD_HOSTS
        and parsed.username is None
        and port in (None, 443)
    )


def download_file(url):
    """Download an allowlisted https URL with TLS verification, a timeout and a size cap."""
    if not is_allowed_url(url):
        raise ValueError("URL host is not allowed")
    # Redirects are not followed, so an allowed host cannot bounce us to an internal address.
    with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT_S, allow_redirects=False) as resp:
        resp.raise_for_status()
        buffer = io.BytesIO()
        for chunk in resp.iter_content(64 * 1024):
            buffer.write(chunk)
            if buffer.tell() > MAX_DOWNLOAD_BYTES:
                raise ValueError("file is too large")
    buffer.seek(0)
    return buffer


# --- /extract -----------------------------------------------------------------
DETAIL_KEYS = [
    "bilirubin", "albumin", "tryglycerides", "prothrombin", "copper",
    "platelets", "sgot", "alt", "alk_phos", "cholesterol", "reported_date",
]

# Each field has several patterns, tried in order, because labs lay reports out differently
# (for example "AST (SGOT) 11.0", "ASPARTATE AMINOTRANSFERASE (AST/SGOT) 13", "BILIRUBIN, TOTAL 1.37").
# Section headers such as "ALKALINE PHOSPHATASE, SERUM" contain no number and simply do not match.
# Values may start with "<" when the lab reports "below detection limit"; the user must review those.
NUM = r"([\d\.]+)"
NUM_LT = r"([\d\.<]+)"
PATTERNS = {
    "bilirubin": [r"Bilirubin\s*,?\s*Total\s*" + NUM, r"Bilirubin\s*" + NUM],
    "albumin": [r"Albumin\s*" + NUM],
    "tryglycerides": [r"Triglycerides\s*" + NUM],
    "prothrombin": [r"Prothrombin\s*" + NUM],
    "copper": [r"Copper\s*" + NUM],
    "platelets": [r"Platelet\s*Count\s*" + NUM],
    "sgot": [
        r"AST\s*\(\s*SGOT\s*\)\s*" + NUM_LT,
        r"ASPARTATE\s+AMINOTRANSFERASE\s*(?:\(\s*AST\s*/\s*SGOT\s*\))?\s*" + NUM_LT,
    ],
    "alt": [
        r"ALT\s*\(\s*SGPT\s*\)\s*" + NUM_LT,
        r"ALANINE\s+AMINOTRANSFERASE\s*(?:\(\s*ALT\s*/\s*SGPT\s*\))?\s*" + NUM_LT,
    ],
    "alk_phos": [r"Alkaline\s*Phosphatase\s*(?:\(\s*ALP\s*\))?\s*" + NUM_LT],
    "cholesterol": [r"Cholesterol,\s*Total\s*" + NUM],
    "reported_date": [
        r"(?:Reported\s*:|DATE\s*:|DATE\s*OF\s*REPORT\s*:)\s*(\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)?"
    ],
}


def extract_text_from_pdf(pdf_stream):
    text = ""
    try:
        with pdfplumber.open(pdf_stream) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text
    except Exception:
        log.exception("PDF text extraction failed")
    return text


def normalise_platelets(value):
    """Platelets are expected in 10^3/uL (same number as 10^9/L). Some labs print the absolute count
    per uL or cu.mm (for example 1550000); convert those. Counts that low cannot be mistaken for it."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return value
    if number >= 10000:
        number = number / 1000
    return f"{number:g}"


def extract_details(text):
    details = {}
    for key, patterns in PATTERNS.items():
        details[key] = None
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                details[key] = match.group(1)
                break
    if details["platelets"] is not None:
        details["platelets"] = normalise_platelets(details["platelets"])
    return details


def process_pdf_file(pdf_url):
    try:
        return extract_details(extract_text_from_pdf(download_file(pdf_url)))
    except Exception as exc:
        log.warning("could not process a report file: %s", exc)
        return {key: None for key in DETAIL_KEYS}


def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%d/%m/%Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def consolidate_reports(reports):
    """Merge several reports. Values from the most recently dated report win."""
    consolidated = {key: None for key in DETAIL_KEYS}
    ordered = sorted(
        reports,
        key=lambda r: parse_date(r.get("reported_date")) or datetime.min,
    )  # oldest first, so later reports overwrite earlier ones
    for report in ordered:
        for key in DETAIL_KEYS:
            if report.get(key) is not None:
                consolidated[key] = report[key]
    return consolidated


@app.route("/extract", methods=["POST"])
def extract_data():
    body = request.get_json(silent=True) or {}
    urls = body.get("pdf_urls")
    if not isinstance(urls, list) or not 1 <= len(urls) <= MAX_FILES:
        return jsonify({"error": f"Provide 1-{MAX_FILES} PDF URLs"}), 400
    if not all(isinstance(u, str) and is_allowed_url(u) for u in urls):
        return jsonify({"error": "One or more URLs are not allowed"}), 400
    return jsonify(consolidate_reports([process_pdf_file(u) for u in urls]))


# --- /image -------------------------------------------------------------------
_roboflow = None


def roboflow():
    global _roboflow
    if _roboflow is None:
        if not ROBOFLOW_API_KEY:
            raise RuntimeError("ROBOFLOW_API_KEY is not set")
        from inference_sdk import InferenceHTTPClient

        _roboflow = InferenceHTTPClient(api_url="https://detect.roboflow.com", api_key=ROBOFLOW_API_KEY)
    return _roboflow


NO_FINDINGS_TEXT = (
    "The model did not detect any of the findings it was trained to recognise in this image. "
    "This does not mean the image is normal or that nothing is wrong: the tool only looks for a "
    "small set of features on stained tissue slides and can miss others. Please ask a clinician "
    "to review the original image."
)


@app.route("/image", methods=["POST"])
def extract_image():
    body = request.get_json(silent=True) or {}
    image_url = body.get("image_url")
    if not isinstance(image_url, str) or not is_allowed_url(image_url):
        return jsonify({"error": "A valid uploaded image URL is required"}), 400

    try:
        result = roboflow().infer(image_url, model_id=ROBOFLOW_MODEL_ID)
        predictions = result.get("predictions", [])
    except Exception:
        log.exception("image inference failed")
        return jsonify({"error": "Image analysis failed"}), 502

    classes = sorted({p["class"] for p in predictions if isinstance(p.get("class"), str)})
    detections = [
        {"class": p["class"], "confidence": round(float(p.get("confidence", 0)), 3)}
        for p in predictions
        if isinstance(p.get("class"), str)
    ]

    list_keys = ["diagnosis", "lifestyle_recommendations", "precautions", "medical_treatments", "doctor_type"]
    if not classes:
        # Never ask the LLM to describe an empty result.
        return jsonify(
            {"detections": [], "analysis": NO_FINDINGS_TEXT, **{key: [] for key in list_keys}}
        )

    prompt = (
        f"{SAFETY_RULES}\n"
        f"An image model that looks for features on stained liver tissue slides detected: {classes}. "
        "These are automated detections, not a diagnosis. "
        'Return JSON with exactly these keys: "analysis" (what these findings generally mean and '
        'the limits of an automated detection), "diagnosis" (list naming the detected features), '
        '"lifestyle_recommendations" (list), "precautions" (list), "medical_treatments" (list of '
        'general treatment approaches a clinician might discuss, no drug names or doses), '
        '"doctor_type" (list of medical specialties).'
    )
    narrative, narrative_ok = narrate(prompt, list_keys)
    if not narrative["diagnosis"]:
        narrative["diagnosis"] = classes
    return jsonify({"detections": detections, "narrative_available": narrative_ok, **narrative})


if __name__ == "__main__":
    # Development only. In production run behind gunicorn on a private network:
    #   gunicorn -w 2 -b 127.0.0.1:3005 app:app
    app.run(
        debug=os.environ.get("FLASK_DEBUG") == "1",
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "3005")),
    )
