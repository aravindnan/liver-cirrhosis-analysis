# Cirrh0 ML service

Flask service used by the API: stage estimate (`/predict`), lab extraction (`/extract`), slide image detection (`/image`).

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in keys, then export them
gunicorn --workers 1 --threads 4 --timeout 120 --bind 127.0.0.1:3005 app:app
```

One worker keeps memory low (about 220 MB measured); threads let it wait on the Gemini and Roboflow calls in parallel. Set `ML_SERVICE_TOKEN` in production: every route except `/` then requires it in an `X-Service-Token` header.

## Model

`model.pkl`, `scaler.bin` and `model_card.json` are produced by `train_model.py`:

```bash
pip install -r requirements-train.txt
python train_model.py            # evaluate only
python train_model.py --save     # evaluate and write the artifacts
```

Evaluation fits imputation, scaling and any resampling inside each cross-validation training fold, so there is no train/test leakage. Current cross-validated accuracy is about 50% against a 38% majority-class baseline; stage 1 is the weakest class. `model_card.json` records the numbers, feature order, data hash and limitations. The model is trained on the Mayo Clinic primary biliary cholangitis trial and is not a diagnostic tool.

The older notebooks are kept for history. Their reported accuracy is inflated by SMOTE being applied before the train/test split.
