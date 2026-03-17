from fastapi import APIRouter
from pydantic import BaseModel

from src.services.flood_prediction_service import FloodPredictionService
from src.services.llm_service import LLMService

router = APIRouter()
_flood_service = FloodPredictionService()
_llm_service = LLMService()


class PredictRequest(BaseModel):
    latitude: float
    longitude: float


class AskRequest(BaseModel):
    question: str


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/predict_flood")
def predict_flood(request: PredictRequest) -> dict:
    return _flood_service.predict(request.latitude, request.longitude)


@router.post("/ask_ai")
def ask_ai(request: AskRequest) -> dict[str, str]:
    return {"answer": _llm_service.answer(request.question)}
