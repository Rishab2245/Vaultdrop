from fastapi import APIRouter
from models.request_models import ScoreRequest
from models.response_models import ScoreResponse
from services.scoring_service import ScoringService

router = APIRouter()
service = ScoringService()


@router.post("", response_model=ScoreResponse)
async def score(request: ScoreRequest):
    return await service.score(request.text, request.category, request.hint_text)
