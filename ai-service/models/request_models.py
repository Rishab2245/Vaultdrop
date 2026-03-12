from pydantic import BaseModel
from typing import Optional


class ModerateRequest(BaseModel):
    text: str
    secret_id: Optional[str] = None


class DuplicateCheckRequest(BaseModel):
    text: str
    secret_id: str
    pool_date: str  # e.g. "2026-03-09"


class ScoreRequest(BaseModel):
    text: str
    category: str
    hint_text: Optional[str] = None


class PIIRedactRequest(BaseModel):
    text: str
