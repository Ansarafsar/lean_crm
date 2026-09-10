import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.logging_config import truncate
from app.models import Activity, Lead
from app.routes.deps import get_lead_or_404
from app.schemas.activity import ActivityOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/leads", tags=["activities"])


@router.get("/{lead_id}/activities", response_model=list[ActivityOut])
def list_activities(
    lead: Lead = Depends(get_lead_or_404), db: Session = Depends(get_db)
):
    stmt = (
        select(Activity)
        .where(Activity.lead_id == lead.id)
        .order_by(Activity.created_at.desc(), Activity.id.desc())
    )
    return db.execute(stmt).scalars().all()


@router.post(
    "/{lead_id}/activities",
    response_model=ActivityOut,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    payload: dict,
    lead: Lead = Depends(get_lead_or_404),
    db: Session = Depends(get_db),
):
    # Validated by hand rather than via a Pydantic body model so blank content
    # returns 400 (as specified) instead of Pydantic's 422.
    content = payload.get("content")
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(
            status_code=400,
            detail="Activity content is required and cannot be empty.",
        )

    activity_type = payload.get("type", "note")
    if activity_type not in ("note", "call", "email", "meeting"):
        raise HTTPException(
            status_code=400,
            detail="Activity type must be one of: note, call, email, meeting.",
        )

    activity = Activity(
        lead_id=lead.id, type=activity_type, content=content.strip()
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    logger.info(
        "activity created lead=%s type=%s content=%r",
        lead.id,
        activity.type,
        truncate(activity.content),
    )
    return activity
