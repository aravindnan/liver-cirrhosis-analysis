"""Train and honestly evaluate the stage model.

Why this exists: the original notebook ran SMOTE on the whole dataset *before* the train/test
split (and imputed on the whole dataset), so synthetic copies of training rows leaked into the
test set and the reported ~72% accuracy was optimistic. Here everything that learns from data
(imputation, scaling, SMOTE) is fitted inside each cross-validation training fold only.

Usage:
  python train_model.py            # evaluate and print metrics
  python train_model.py --save     # also write model.pkl, scaler.bin and model_card.json
"""
import argparse
import hashlib
import json
import sys
import warnings
from datetime import date

import joblib
import numpy as np
import pandas as pd
import sklearn
from catboost import CatBoostClassifier
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import balanced_accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")
DATA = "cirrhosis.csv"
SEED = 42

# Order matters: app.py builds the feature row in exactly this order.
# `Drug` is deliberately not a feature: users are never asked for it and the old service sent a constant.
FEATURES = [
    "Age", "Sex", "Ascites", "Hepatomegaly", "Spiders", "Edema", "Bilirubin", "Cholesterol",
    "Albumin", "Copper", "Alk_Phos", "SGOT", "Tryglicerides", "Platelets", "Prothrombin",
]
# N_Days and Status are not features: they describe the outcome and would leak it.


def load():
    df = pd.read_csv(DATA)
    n_raw = len(df)
    df = df.dropna(subset=["Stage"]).copy()  # never impute the target
    df["Age"] = (df["Age"] / 365.0).round()
    df["Sex"] = df["Sex"].map({"M": 1.0, "F": 0.0})
    df["Edema"] = df["Edema"].map({"N": 0.0, "S": -1.0, "Y": 1.0})  # same encoding as app.py
    for col in ("Ascites", "Hepatomegaly", "Spiders"):
        df[col] = df[col].map({"Y": 1.0, "N": 0.0})
    X, y = df[FEATURES].astype(float), df["Stage"].astype(int)
    return X, y, n_raw


def cb():
    return CatBoostClassifier(iterations=300, learning_rate=0.05, depth=6, random_seed=SEED,
                              verbose=0, thread_count=-1, allow_writing_files=False)


def candidates():
    return {
        "smote": ImbPipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler()),
                              ("smote", SMOTE(random_state=SEED)), ("model", cb())]),
        "class_weights": Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler()),
                                   ("model", CatBoostClassifier(iterations=300, learning_rate=0.05, depth=6,
                                                                random_seed=SEED, verbose=0, thread_count=-1,
                                                                allow_writing_files=False,
                                                                auto_class_weights="Balanced"))]),
    }


def evaluate(X, y):
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=SEED)
    scoring = {"accuracy": "accuracy", "balanced_accuracy": "balanced_accuracy", "macro_f1": "f1_macro"}
    results = {}
    for name, pipe in candidates().items():
        s = cross_validate(pipe, X, y, cv=cv, scoring=scoring, n_jobs=1)
        oof = cross_val_predict(pipe, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=SEED))
        cm = confusion_matrix(y, oof, labels=[1, 2, 3, 4])
        results[name] = {
            **{k: [round(float(np.mean(s[f"test_{k}"])), 4), round(float(np.std(s[f"test_{k}"])), 4)] for k in scoring},
            "per_class_recall": {str(c): round(float(cm[i, i] / cm[i].sum()), 3) for i, c in enumerate([1, 2, 3, 4])},
            "out_of_fold_confusion_matrix": cm.tolist(),
        }
    majority = float(y.value_counts(normalize=True).max())
    return results, round(majority, 4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save", action="store_true")
    args = ap.parse_args()

    X, y, n_raw = load()
    print(f"rows: {n_raw} raw, {len(X)} with a Stage label; class counts: {y.value_counts().sort_index().to_dict()}")
    results, majority = evaluate(X, y)
    print(f"majority-class baseline accuracy: {majority:.1%}")
    for name, r in results.items():
        print(f"\n[{name}] 5-fold x3 CV (mean, std)")
        for k in ("accuracy", "balanced_accuracy", "macro_f1"):
            print(f"  {k:18s} {r[k][0]:.3f} +/- {r[k][1]:.3f}")
        print(f"  per-class recall   {r['per_class_recall']}")
        print(f"  confusion (rows=true 1..4, cols=pred 1..4): {r['out_of_fold_confusion_matrix']}")

    best = max(results, key=lambda n: results[n]["balanced_accuracy"][0])
    print(f"\nselected: {best} (highest cross-validated balanced accuracy)")
    if not args.save:
        return 0

    # Final fit on all labelled rows. The serving code applies scaler.transform then model.predict,
    # so split the fitted steps out; imputation is baked in by filling with the training medians.
    pipe = candidates()[best]
    pipe.fit(X, y)
    steps = dict(pipe.named_steps)
    medians = steps["impute"].statistics_
    model_pipe_scaler, model = steps["scale"], steps["model"]
    joblib.dump(model, "model.pkl")
    joblib.dump(model_pipe_scaler, "scaler.bin")
    card = {
        "model_version": f"catboost-{best}-{date.today().isoformat()}",
        "features": FEATURES,
        "imputation_medians": dict(zip(FEATURES, [round(float(m), 4) for m in medians])),
        "selected_strategy": best,
        "evaluation": {"method": "5-fold stratified CV repeated 3 times; imputation, scaling and SMOTE fitted inside training folds only",
                       "majority_class_baseline_accuracy": majority, "candidates": results},
        "training_rows": int(len(X)),
        "data_sha256": hashlib.sha256(open(DATA, "rb").read()).hexdigest(),
        "library_versions": {"python": sys.version.split()[0], "scikit-learn": sklearn.__version__,
                             "catboost": __import__("catboost").__version__, "numpy": np.__version__},
        "limitations": [
            "Trained on the Mayo Clinic primary biliary cholangitis trial (about 400 patients, 1974-1984).",
            "Stage is the histologic stage, normally determined by biopsy; this model estimates it from labs.",
            "Not validated on other liver diseases, other populations or modern patients; not a diagnosis.",
        ],
    }
    json.dump(card, open("model_card.json", "w"), indent=2)
    print("saved model.pkl, scaler.bin, model_card.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
