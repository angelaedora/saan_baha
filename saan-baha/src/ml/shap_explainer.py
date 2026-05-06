def explain_prediction(feature_names: list[str], values: list[float]) -> list[dict]:
    return [
        {"feature": name, "value": value, "importance": abs(value)}
        for name, value in zip(feature_names, values)
    ]
