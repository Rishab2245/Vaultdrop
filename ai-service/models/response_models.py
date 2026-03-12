from pydantic import BaseModel
from typing import List, Optional


class ModerateResponse(BaseModel):
    safe: bool
    score: float  # 0-1, 1 = safe
    flags: List[str]


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    similarity: float
    nearest_id: Optional[str] = None


class ScoreResponse(BaseModel):
    explosive_score: float  # 0-100
    reasoning: str


class PIIRedactResponse(BaseModel):
    redacted_text: str
    pii_found: List[str]
