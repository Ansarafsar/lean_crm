from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, computed_field

LeadStatus = Literal["new", "contacted", "qualified", "proposal", "won", "lost"]


class LeadBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    job_title: str | None = None
    company: str
    email: str
    status: LeadStatus

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class LeadListItem(LeadBase):
    """Row for the leads table: includes deal value and next follow-up so the
    list renders from a single request."""

    deal_value: int | None = None
    deal_currency: str | None = None
    deal_stage: str | None = None
    next_follow_up: date | None = None


class LeadDetail(LeadBase):
    phone: str | None = None
    source: str | None = None
    industry: str | None = None
    company_size: str | None = None
    location: str | None = None
    created_at: datetime
    updated_at: datetime
