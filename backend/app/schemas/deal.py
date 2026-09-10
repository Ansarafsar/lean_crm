from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

DealStage = Literal["new", "contacted", "qualified", "proposal", "won", "lost"]

# Order shown in the pipeline UI. "lost" is a terminal state outside the flow.
PIPELINE_STAGES: list[str] = ["new", "contacted", "qualified", "proposal", "won"]


class DealUpdate(BaseModel):
    """An unknown stage fails Literal validation -> FastAPI returns 422."""

    stage: DealStage


class DealOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    name: str
    value: int
    currency: str
    stage: DealStage
    updated_at: datetime
