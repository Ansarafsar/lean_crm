from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

ActivityType = Literal["note", "call", "email", "meeting"]


class ActivityCreate(BaseModel):
    type: ActivityType = "note"
    content: str

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        # Routes check this too, so the empty case surfaces as a 400 rather
        # than Pydantic's 422. This guards non-HTTP callers (e.g. seed).
        if not v or not v.strip():
            raise ValueError("Activity content cannot be empty.")
        return v.strip()


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    type: ActivityType
    content: str
    created_at: datetime
