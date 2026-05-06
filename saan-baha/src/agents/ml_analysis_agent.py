from src.services.flood_prediction_service import FloodPredictionService


def analyze_location(latitude: float, longitude: float) -> dict:
    service = FloodPredictionService()
    return service.predict(latitude, longitude)
