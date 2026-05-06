from src.services.flood_prediction_service import FloodPredictionService


def test_predict_output_schema() -> None:
    service = FloodPredictionService()
    result = service.predict(14.6760, 121.0437)
    assert "risk" in result
    assert "probability" in result
