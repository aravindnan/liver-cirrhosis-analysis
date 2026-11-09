import numpy as np
import pytest


# ---- /predict -----------------------------------------------------------------
def test_predict_returns_model_stage_without_llm(client, lab):
    r = client.post("/predict", json=lab)
    body = r.get_json()
    assert r.status_code == 200
    assert body["stage"] in (1, 2, 3, 4)
    assert body["narrative_available"] is False  # no API key in tests; the result must still work
    for key in ("analysis", "lifestyle_recommendations", "precautions", "self_treatment_plan", "doctor_type"):
        assert key in body


def test_probabilities_are_consistent_with_stage(client, lab):
    body = client.post("/predict", json=lab).get_json()
    probs = body["probabilities"]
    assert set(probs) == {"1", "2", "3", "4"}
    assert sum(probs.values()) == pytest.approx(1, abs=1e-3)
    assert str(body["stage"]) == max(probs, key=probs.get)


def test_model_version_comes_from_model_card(client, service, lab):
    assert client.post("/predict", json=lab).get_json()["model_version"] == service.MODEL_CARD["model_version"]


@pytest.mark.parametrize(
    "patch",
    [{"copper": None}, {"sgot": "<5"}, {"platelets": 200000}, {"ascites": "maybe"}, {"age": "nan"}, {"age": True}, {"edema": "X"}],
)
def test_predict_rejects_bad_input(client, lab, patch):
    r = client.post("/predict", json={**lab, **patch})
    assert r.status_code == 400
    assert "error" in r.get_json()


def test_predict_rejects_non_json(client):
    assert client.post("/predict", data="x").status_code == 400


def test_endpoint_matches_the_model_on_real_dataset_rows(client, service, training):
    """Guards the feature order: the service must feed the model columns exactly as training did."""
    X, _y, _n = training.load()
    inv_sex, inv_edema, yes_no = {1.0: "male", 0.0: "female"}, {0.0: "N", -1.0: "S", 1.0: "Y"}, {1.0: "Y", 0.0: "N"}
    rows = X.dropna().iloc[:25]
    assert len(rows) == 25
    for _, r in rows.iterrows():
        body = dict(age=r.Age, sex=inv_sex[r.Sex], ascites=yes_no[r.Ascites], hepatomegaly=yes_no[r.Hepatomegaly],
                    spiders=yes_no[r.Spiders], edema=inv_edema[r.Edema], bilirubin=r.Bilirubin, cholesterol=r.Cholesterol,
                    albumin=r.Albumin, copper=r.Copper, alk_phos=r.Alk_Phos, sgot=r.SGOT, tryglycerides=r.Tryglicerides,
                    platelets=r.Platelets, prothrombin=r.Prothrombin)
        direct = int(np.asarray(service.model.predict(
            service.scaler.transform([r[service.MODEL_CARD["features"]].tolist()]))).ravel()[0])
        assert client.post("/predict", json=body).get_json()["stage"] == direct


def test_model_card_is_honest_about_evaluation(service):
    card = service.MODEL_CARD
    assert card["limitations"]
    assert card["evaluation"]["majority_class_baseline_accuracy"] < 0.4
    assert "inside training folds only" in card["evaluation"]["method"]


# ---- LLM output handling --------------------------------------------------------
@pytest.mark.parametrize("text", ['```json\n{"analysis":"hi"}\n```', 'noise {"analysis":"hi"} tail'])
def test_parse_json_object_accepts_fenced_or_wrapped_json(service, text):
    assert service.parse_json_object(text)["analysis"] == "hi"


@pytest.mark.parametrize("text", ["{'a': __import__('os').system('echo pwned')}", "not json", "[1, 2]", ""])
def test_parse_json_object_never_evaluates_or_accepts_non_objects(service, text):
    with pytest.raises(Exception):
        service.parse_json_object(text)


def test_narrative_is_sanitised(service, monkeypatch):
    class Resp:
        text = '{"analysis": "x", "doctor_type": ["Hepatologist", 5, "  "], "precautions": "not a list"}'

    class Fake:
        def generate_content(self, *a, **k):
            return Resp()

    monkeypatch.setattr(service, "_gemini", Fake())
    narrative, ok = service.narrate("p", ["doctor_type", "precautions"])
    assert ok and narrative["doctor_type"] == ["Hepatologist"] and narrative["precautions"] == []


def test_llm_failure_does_not_break_prediction(client, service, monkeypatch, lab):
    class Boom:
        def generate_content(self, *a, **k):
            raise RuntimeError("quota exceeded")

    monkeypatch.setattr(service, "_gemini", Boom())
    body = client.post("/predict", json=lab).get_json()
    assert "stage" in body and body["narrative_available"] is False


# ---- URL allowlist (SSRF) ---------------------------------------------------------
@pytest.mark.parametrize(
    "url,allowed",
    [
        ("https://res.cloudinary.com/a/b.pdf", True),
        ("http://res.cloudinary.com/a", False),
        ("https://169.254.169.254/latest", False),
        ("https://res.cloudinary.com.evil.io/x", False),
        ("https://user@evil.io@res.cloudinary.com/", False),
        ("https://res.cloudinary.com:8443/x", False),
        ("file:///etc/passwd", False),
    ],
)
def test_is_allowed_url(service, url, allowed):
    assert service.is_allowed_url(url) is allowed


def test_extract_and_image_reject_disallowed_urls(client):
    assert client.post("/extract", json={"pdf_urls": ["https://169.254.169.254/x"]}).status_code == 400
    assert client.post("/extract", json={"pdf_urls": []}).status_code == 400
    assert client.post("/extract", json={"pdf_urls": ["https://res.cloudinary.com/a.pdf"] * 11}).status_code == 400
    assert client.post("/image", json={"image_url": "http://localhost:8000/x"}).status_code == 400


# ---- extraction ------------------------------------------------------------------
def _report(service, **values):
    return {**{k: None for k in service.DETAIL_KEYS}, **values}


def test_consolidate_prefers_latest_report_fills_gaps_and_survives_missing_dates(service):
    older = _report(service, bilirubin="1.0", albumin="3.0", reported_date="01/01/2023")
    newer = _report(service, bilirubin="2.0", reported_date="05/06/2024")
    undated = _report(service)
    merged = service.consolidate_reports([newer, undated, older])
    assert merged["bilirubin"] == "2.0" and merged["albumin"] == "3.0" and merged["reported_date"] == "05/06/2024"


def test_a_failed_file_yields_empty_values_instead_of_an_error(service):
    assert service.process_pdf_file("https://169.254.169.254/x") == {k: None for k in service.DETAIL_KEYS}


def test_extract_details_reads_known_lab_layout(service):
    text = "Bilirubin Total 0.80 mg/dL\nAlbumin 4.10 g/dL\nPlatelet Count 250\nAST (SGOT) 28.0 U/L"
    d = service.extract_details(text)
    assert (d["bilirubin"], d["albumin"], d["platelets"], d["sgot"]) == ("0.80", "4.10", "250", "28.0")


# ---- service token ----------------------------------------------------------------
def test_service_token_is_enforced_when_configured(client, service, monkeypatch, lab):
    monkeypatch.setattr(service, "SERVICE_TOKEN", "s3cret")
    assert client.post("/predict", json=lab).status_code == 401
    assert client.post("/predict", json=lab, headers={"X-Service-Token": "nope"}).status_code == 401
    assert client.post("/predict", json=lab, headers={"X-Service-Token": "s3cret"}).status_code == 200
    assert client.get("/").status_code == 200  # health check stays open


# ---- extraction against the real sample reports in testing-assets/ -------------------
ASSETS = __import__("pathlib").Path(__file__).resolve().parents[2] / "testing-assets"


def _extract_from(service, name):
    import pdfplumber

    with pdfplumber.open(ASSETS / name) as pdf:
        text = "".join((page.extract_text() or "") for page in pdf.pages)
    return service.extract_details(text)


@pytest.mark.parametrize(
    "report,expected",
    [
        ("WM17S.pdf", {"bilirubin": "0.20", "albumin": "4.00", "platelets": "200", "sgot": "11.0", "alt": "21.0", "alk_phos": "150.00"}),
        ("LFT2.pdf", {"bilirubin": "0.90", "albumin": "2.00", "sgot": "<10", "alt": "<10", "alk_phos": "<30"}),
        ("test3.pdf", {"bilirubin": "1.37", "albumin": "3.9", "platelets": "213", "sgot": "13", "alt": "15", "alk_phos": "80"}),
        ("LFT.pdf", {"bilirubin": "1.1", "albumin": "4.5"}),
    ],
)
def test_extraction_on_real_lab_reports(service, report, expected):
    details = _extract_from(service, report)
    for key, value in expected.items():
        assert details[key] == value, f"{report}: {key}"


def test_platelets_reported_per_microlitre_are_normalised(service):
    assert _extract_from(service, "cbc1.pdf")["platelets"] == "1550"
    assert service.normalise_platelets("250") == "250"
    assert service.normalise_platelets("450000") == "450"
    assert service.normalise_platelets("not a number") == "not a number"


def test_section_headers_without_numbers_do_not_produce_values(service):
    text = "ALKALINE PHOSPHATASE, SERUM\nALANINE AMINOTRANSFERASE (ALT/SGPT), SERUM\nBILIRUBIN (TOTAL, DIRECT, INDIRECT), SERUM"
    details = service.extract_details(text)
    assert details["alk_phos"] is None and details["alt"] is None and details["bilirubin"] is None


def test_total_bilirubin_is_preferred_over_direct(service):
    text = "Bilirubin Direct 0.2 mg/dL\nBilirubin Total 0.9 mg/dL\nBilirubin Indirect 0.7"
    assert service.extract_details(text)["bilirubin"] == "0.9"
