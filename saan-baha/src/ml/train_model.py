from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier


def train_from_csv(dataset_path: str, target_col: str, output_path: str) -> str:
    df = pd.read_csv(dataset_path)
    X = df.drop(columns=[target_col])
    y = df[target_col]
    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X, y)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, out)
    return str(out)
