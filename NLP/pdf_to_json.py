import requests
import pdfplumber
import json
import re
from io import BytesIO
import os

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
        "Bilirubin": None,
        "Albumin": None,
        "Triglycerides": None,
        "Prothrombin": None,
        "Copper": None,
        "Platelet Count": None,
        "SGOT": None,
        "Alkaline Phosphatase (ALP)": None
    }
    
    patterns = {
        "Bilirubin": r"Bilirubin\s*(?:Total|Direct|Indirect)?\s*([\d\.]+)\s*(?:mg/dL)?",
        "Albumin": r"Albumin\s*([\d\.]+)\s*(?:g/dL)?",
        "Triglycerides": r"Triglycerides\s*([\d\.]+)\s*(?:mg/dL)?",
        "Prothrombin": r"Prothrombin\s*([\d\.]+)\s*(?:mg/dL)?",
        "Copper": r"Copper\s*([\d\.]+)\s*(?:mg/dL)?",
        "Platelet Count": r"Platelet Count\s*([\d\.]+)\s*(?:\d+/L)?",
        "SGOT": r"AST\s*\(SGOT\)\s*([\d\.<]+)\s*(?:U/L)?",
        "Alkaline Phosphatase (ALP)": r"Alkaline\s*Phosphatase\s*\(ALP\)\s*([\d\.<]+)\s*(?:U/L)?"
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

def main(pdf_urls, output_path):
    """
    Main function to process multiple PDF files and save results to a JSON file.
    
    Parameters:
    pdf_urls (list): List of URLs of PDF files.
    output_path (str): Path to the output JSON file.
    """
    all_details = []
    
    for pdf_url in pdf_urls:
        details = process_pdf_file(pdf_url)
        all_details.append(details)
    
    # Save all collected details to JSON
    try:
        with open(output_path, 'w', encoding='utf-8') as json_file:
            json.dump(all_details, json_file, indent=4, ensure_ascii=False)
        print(f"All data successfully saved to {output_path}")
    except Exception as e:
        print(f"An error occurred while saving to JSON: {e}")

# List of PDF file URLs
pdf_urls = [
    'https://cdn1.lalpathlabs.com/live/reports/WM17S.pdf',
    # Add more URLs here
]

# Path to the output JSON file
output_json_path = r'D:\Sproj\aggregated_output.json'

# Process the list of PDF files
main(pdf_urls, output_json_path)
