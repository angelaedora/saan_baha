from src.ml.feature_engineering import build_feature_vector


class FloodPredictionService:
    def predict(self, latitude: float, longitude: float) -> dict:
        features = build_feature_vector(latitude, longitude)
        probability = min(max((abs(latitude) + abs(longitude)) % 1, 0.01), 0.99)
        risk = "High" if probability >= 0.66 else "Moderate" if probability >= 0.33 else "Low"
        return {
            "latitude": latitude,
            "longitude": longitude,
            "risk": risk,
            "probability": probability,
            "features": features,
        }
