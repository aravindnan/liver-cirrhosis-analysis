import importlib.util
import os
import sys
from pathlib import Path

import pytest

SERVICE_DIR = Path(__file__).resolve().parents[1]


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, SERVICE_DIR / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def service():
    # Tests must never reach real LLM or vision providers.
    for key in ("GEMINI_API_KEY", "ROBOFLOW_API_KEY", "ML_SERVICE_TOKEN"):
        os.environ.pop(key, None)
    return _load("cirrh0_app", "app.py")


@pytest.fixture()
def client(service, monkeypatch):
    monkeypatch.setattr(service, "SERVICE_TOKEN", "")
    monkeypatch.setattr(service, "_gemini", None)
    return service.app.test_client()


@pytest.fixture(scope="session")
def training():
    return _load("cirrh0_train", "train_model.py")


@pytest.fixture()
def lab():
    return dict(age=55, sex="male", ascites="N", hepatomegaly="Y", spiders="N", edema="N",
                bilirubin=1.2, cholesterol=180, albumin=3.8, copper=80, alk_phos=300, sgot=40,
                tryglycerides=120, platelets=200, prothrombin=11)
