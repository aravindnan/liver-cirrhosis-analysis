from flask import Flask, request, jsonify
import joblib
import json
import requests
import google.generativeai as genai
import os
import re
from io import BytesIO
import pdfplumber
from datetime import datetime
from inference_sdk import InferenceHTTPClient
import cv2 as cv

genai.configure(api_key="AIzaSyAXqPyND9lGYffQO_aMIV1hntBX4lDPmnQ")

gemini_model=genai.GenerativeModel('gemini-1.5-flash')

model = joblib.load('model.pkl')
scaler = joblib.load('scaler.bin')

app = Flask(__name__)

@app.route("/")
def home():
    return "Liver Prediction API is running."

@app.route("/predict", methods=["POST"])
def predict():
    if request.method == "POST":
        data = request.json

        # Extract data from the JSON request
        drug = 1.0
        age = float(data.get('age'))
        
        gender = data.get('sex')
        sex = 0.0 if gender == 'female' else 1.0 if gender == 'male' else -1.0
        
        ascites = 0.0 if data.get('ascites') == 'N' else 1.0 if data.get('ascites') == 'Y' else -1.0
        hepatomegaly = 0.0 if data.get('hepatomegaly') == 'N' else 1.0 if data.get('hepatomegaly') == 'Y' else -1.0
        spider = 0.0 if data.get('spiders') == 'N' else 1.0 if data.get('spiders') == 'Y' else -1.0
        edema = 0.0 if data.get('edema') == 'N' else -1.0 if data.get('edema') == 'S' else 1.0 if data.get('edema') == 'Y' else -1.0
        
        bilirubin = float(data.get('bilirubin'))
        cholesterol = float(data.get('cholesterol'))
        albumin = float(data.get('albumin'))
        copper = float(data.get('copper'))
        alk_phos = float(data.get('alk_phos'))
        sgot = float(data.get('sgot'))
        tryglycerides = float(data.get('tryglycerides'))
        platelets = float(data.get('platelets'))
        prothrombin = float(data.get('prothrombin'))
        
        X_test = scaler.transform([[
            drug, age, sex, ascites, hepatomegaly, spider, edema,
            bilirubin, cholesterol, albumin, copper, alk_phos, sgot,
            tryglycerides, platelets, prothrombin
        ]])
        
        predictions = model.predict(X_test)
        output = predictions[0]
        response = {
            "stage": int(output),
            "description": (
                "Normal liver" if output == 1 else
                "Fatty liver" if output == 2 else
                "Liver Fibrosis" if output == 3 else
                "Liver Cirrhosis" if output == 4 else
                "Unknown condition"
            )
        }
        # return jsonify(response)

        
        # # Prepare the request payload for the Gemini model
        # prediction_text = (
        #     "Normal liver" if output == 1 else
        #     "Fatty liver" if output == 2 else
        #     "Liver Fibrosis" if output == 3 else
        #     "Liver Cirrhosis" if output == 4 else
        #     "Unknown condition"
        # )

        # print(prediction_text)
        
        # gemini_payload = {
        #     "stage": "",
        #     "analysis": "",
        #     "lifestyle_recommendations": [],
        #     "precautions": [],
        #     "self_treatment_plan": [],
        #     "doctor_type": [
        #         "Doctor 1", "Doctor 2", "Doctor 1", "Doctor 2", 
        #         "Doctor 1", "Doctor 2"
        #     ]
        # }
        
        # # Generate analysis using the Gemini model
        gemini_response = gemini_model.generate_content(
            f'Generate an analysis for stage {output} liver condition, with {response}. Include lifestyle_recommendations, precautions, self_treatment_plans, and suitable doctors to visit as doctor_types. Give the output in python dictionary format as: "{{"stage":"", "analysis": "", "lifestyle_recommendations": [], "precautions": [], "self_treatment_plan": [], "doctor_type": ["Doctor 1", "Doctor 2", "Doctor 3", "Doctor 4", "Doctor 5", "Doctor 6"]}}". Do not respond with ` ```json or python or any datatype or end with ``` just give me the text enclosed in curly parenthesis`'
        )

        # # Parse and return the response from the Gemini model
        # # gemini_payload['analysis'] = gemini_response.content 
        print(gemini_response.text)
        return (gemini_response.text)

@app.route("/extract", methods=["POST"])
def extract_data():
    if request.method == "POST":
        pdf_urls = request.json.get('pdf_urls', [])
        if not pdf_urls:
            return jsonify({"error": "No PDF URLs provided"}), 400
        
        # Process the list of PDF files and return the results
        extracted_data = process_multiple_pdfs(pdf_urls)
        return jsonify(extracted_data)

def download_pdf_from_url(url):
    """
    Downloads a PDF from a URL.
    
    Parameters:
    url (str): URL of the PDF file.
    
    Returns:
    BytesIO: In-memory binary stream of the PDF file.
    """
    try:
        response = requests.get(url, verify=False)  # Temporarily disable SSL verification
        response.raise_for_status()  # Check if the request was successful
        return BytesIO(response.content)
    except requests.RequestException as e:
        print(f"An error occurred while downloading the PDF from {url}: {e}")
        return None

def extract_text_from_pdf(pdf_stream):
    """
    Extracts text from a PDF file.
    
    Parameters:
    pdf_stream (BytesIO): In-memory binary stream of the PDF file.
    
    Returns:
    str: Extracted text from the PDF.
    """
    text = ""
    try:
        with pdfplumber.open(pdf_stream) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text
    except Exception as e:
        print(f"An error occurred while extracting text: {e}")
    return text

def extract_details(text):
    """
    Extracts specific details from the text using regex.
    
    Parameters:
    text (str): Text extracted from the PDF.
    
    Returns:
    dict: Dictionary with extracted details.
    """
    details = {
        "bilirubin": None,
        "albumin": None,
        "tryglycerides": None,
        "prothrombin": None,
        "copper": None,
        "platelets": None,
        "sgot": None,
        "alk_phos": None,
        "cholesterol": None,
        "reported_date": None
    }
    
    patterns = {
        "bilirubin": r"Bilirubin\s*(?:Total|Direct|Indirect)?\s*([\d\.]+)\s*(?:mg/dL)?",
        "albumin": r"Albumin\s*([\d\.]+)\s*(?:g/dL)?",
        "tryglycerides": r"Triglycerides\s*([\d\.]+)\s*(?:mg/dL)?",
        "prothrombin": r"Prothrombin\s*([\d\.]+)\s*(?:mg/dL)?",
        "copper": r"Copper\s*([\d\.]+)\s*(?:mg/dL)?",
        "platelets": r"Platelet Count\s*([\d\.]+)\s*(?:\d+/L)?",
        "sgot": r"AST\s*\(SGOT\)\s*([\d\.<]+)\s*(?:U/L)?",
        "alk_phos": r"Alkaline\s*Phosphatase\s*\(ALP\)\s*([\d\.<]+)\s*(?:U/L)?",
        "cholesterol": r"Cholesterol,\s*Total\s*([\d\.]+)\s*(?:mg/dL)?",
        # "cholesterol": r"Cholesterol,\s*Total\s*([\d\.]+)\s*<\d+\.\d+mg/dL"
        "reported_date": r"(?i)(?:Reported\s*:|REPORTED\s*:|DATE\s*:|DATE\s*OF\s*REPORT\s*:|Date\s*of\s*Report\s*:)\s*(\d{1,2}[/-][A-Za-z]{3}[/-]\d{2,4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)?"
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            details[key] = match.group(1)
        else:
            details[key] = None  # Explicitly set to None if not found

    return details

def process_pdf_file(pdf_url):
    """
    Processes a PDF file from a URL and returns the extracted details.
    
    Parameters:
    pdf_url (str): URL of the PDF file.
    
    Returns:
    dict: Extracted details from the PDF.
    """
    # Download the PDF from the URL
    pdf_stream = download_pdf_from_url(pdf_url)

    if pdf_stream:
        # Extract text from the PDF
        text = extract_text_from_pdf(pdf_stream)

        # Extract specific details
        details = extract_details(text)
        details["Source URL"] = pdf_url  # Add URL to details for reference
        return details
    else:
        print(f"Failed to download the PDF from {pdf_url}.")
        return {"Source URL": pdf_url, "Error": "Failed to download"}

def process_multiple_pdfs(pdf_urls):
    """
    Processes multiple PDF files and returns the extracted details.
    
    Parameters:
    pdf_urls (list): List of URLs of PDF files.
    
    Returns:
    list: List of dictionaries containing extracted details from each PDF.
    """
    all_details = []
    
    for pdf_url in pdf_urls:
        details = process_pdf_file(pdf_url)
        all_details.append(details)
    
    return consolidate_reports(all_details)
    

def parse_date(date_str):
    try:
        return datetime.strptime(date_str, "%d/%m/%Y")  # Handle date format like "27/12/2023"
    except ValueError:
        try:
            return datetime.strptime(date_str, "%d-%b-%Y")  # Handle date format like "12-Aug-2011"
        except ValueError:
            return None
def consolidate_reports(reports):
    # Initialize the consolidated report with None for all fields
    consolidated_report = {
        "bilirubin": None,
        "albumin": None,
        "tryglycerides": None,
        "prothrombin": None,
        "copper": None,
        "platelets": None,
        "sgot": None,
        "alk_phos": None,
        "cholesterol": None,
        "reported_date": None
    }

    latest_date = None
    latest_report = None

    # First pass to find the latest date and update the consolidated report
    for report in reports:
        reported_date = parse_date(report.get("reported_date", ""))
        
        if reported_date:
            if latest_date is None or reported_date > latest_date:
                latest_date = reported_date
                latest_report = report

        # Update consolidated report with values from the current report if they are not None
        for key in consolidated_report.keys():
            if report.get(key) is not None:
                # Only update if the field is currently None or the report has the latest date
                if consolidated_report[key] is None or (latest_report and report.get("reported_date") == latest_report.get("reported_date")):
                    consolidated_report[key] = report[key]

    # If there's a latest report, use its values to resolve conflicts
    if latest_report:
        for key in consolidated_report.keys():
            if consolidated_report[key] is None and latest_report.get(key) is not None:
                consolidated_report[key] = latest_report[key]
        
        consolidated_report["reported_date"] = latest_report["reported_date"]

    return consolidated_report

@app.route("/image", methods=["POST"])
def extract_image():
    image_url = request.json.get('image_url')
    if not image_url:
        return jsonify({"error": "No image URL provided"}), 400

    extracted_data = process_image(image_url)
    return jsonify(extracted_data)

def process_image(image_url):
    CLIENT = InferenceHTTPClient(
        api_url="https://detect.roboflow.com",
        api_key="ZEsPr7BjoeSKOgNY0L6U"
    )
    
    result = CLIENT.infer(image_url, model_id="liver-yolo/1")
    
     # Extract the classes from the predictions
    classes = list(set([prediction['class'] for prediction in result['predictions']]))
    
    # Prepare the input for the Gemini model
    consolidated_result = {"detected_classes": classes}
    prompt = (
        f"Generate an analysis for {consolidated_result['detected_classes']} liver condition. "
        "This is from a liver cirrhosis prediction model. Include diagnosis (which is the result I give you), "
        "lifestyle_recommendations, precautions, medical_treatments, and suitable doctors to visit as doctor_types. "
        "Give the output in Python dictionary format as: "
        "{\"diagnosis\": [], \"analysis\": \"\", \"lifestyle_recommendations\": [], \"precautions\": [], \"medical_treatments\": [], "
        "\"doctor_type\": [\"Doctor 1\", \"Doctor 2\", \"Doctor 3\", \"Doctor 4\", \"Doctor 5\", \"Doctor 6\"]}. "
        "Only give the dictionary format and no other text or symbol."
    )
    
    # Call the Gemini model
    gemini_response = gemini_model.generate_content(prompt)
    
    # Extract the dictionary from the response using regex
    match = re.search(r'{.*}', gemini_response.text, re.DOTALL)
    if match:
        response_dict = eval(match.group(0))
    else:
        return jsonify({"error": "Invalid response from Gemini model"}), 500
    
    return (response_dict)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=3005)


