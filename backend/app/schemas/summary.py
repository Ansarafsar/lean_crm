from pydantic import BaseModel, Field


class LeadSummary(BaseModel):
    """Contract the model must satisfy. Anything else is rejected."""

    who: str = Field(description="Who this lead is.")
    important: str = Field(description="What matters about this lead.")
    history: str = Field(description="What has happened so far.")
    missing: list[str] = Field(
        default_factory=list, description="Concrete unanswered questions."
    )
