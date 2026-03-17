import joblib


def predict_probability(model_path: str, features: list[float]) -> float:
    model = joblib.load(model_path)
    proba = model.predict_proba([features])[0][1]
    return float(proba)
