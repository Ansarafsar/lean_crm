from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class TaskCreate(BaseModel):
    title: str
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Task title cannot be empty.")
        return v.strip()


class TaskUpdate(BaseModel):
    completed: bool | None = None
    title: str | None = None
    due_date: date | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    title: str
    due_date: date | None
    completed: bool
    created_at: datetime
    completed_at: datetime | None
