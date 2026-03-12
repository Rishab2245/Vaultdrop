from fastapi import APIRouter
from models.request_models import PIIRedactRequest
from models.response_models import PIIRedactResponse
from services.pii_service import PIIService

router = APIRouter()
service = PIIService()


@router.post("", response_model=PIIRedactResponse)
async def redact_pii(request: PIIRedactRequest):
    return await service.redact(request.text)
