from fastapi import APIRouter
from models.request_models import DuplicateCheckRequest
from models.response_models import DuplicateCheckResponse
from services.duplicate_service import DuplicateService

router = APIRouter()
service = DuplicateService()


@router.post("", response_model=DuplicateCheckResponse)
async def check_duplicate(request: DuplicateCheckRequest):
    return await service.check(request.text, request.secret_id, request.pool_date)
