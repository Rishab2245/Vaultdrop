from fastapi import APIRouter
from models.request_models import ModerateRequest
from models.response_models import ModerateResponse
from services.moderation_service import ModerationService

router = APIRouter()
service = ModerationService()


@router.post("", response_model=ModerateResponse)
async def moderate(request: ModerateRequest):
    return await service.moderate(request.text)
