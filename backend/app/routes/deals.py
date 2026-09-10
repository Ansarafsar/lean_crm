import logging

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Deal, Lead
from app.routes.deps import get_lead_or_404
from app.schemas.deal import DealOut, DealUpdate

logger = logging.getLogger(__name__)
router = APIRouter(tags=["deals"])


@router.get("/api/leads/{lead_id}/deal", response_model=DealOut)
def get_deal(lead: Lead = Depends(get_lead_or_404)):
    if lead.deal is None:
        raise HTTPException(status_code=404, detail="This lead has no deal yet.")
    return lead.deal


@router.patch("/api/deals/{deal_id}", response_model=DealOut)
def update_deal(
    payload: DealUpdate,
    deal_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
    """An unknown stage never reaches here - DealUpdate rejects it with 422."""
    deal = db.get(Deal, deal_id)
    if deal is None:
        raise HTTPException(status_code=404, detail=f"Deal {deal_id} not found.")

    previous = deal.stage
    deal.stage = payload.stage

    # Lead status and deal stage share a vocabulary and are shown side by side
    # in the leads table, so keep them from drifting apart.
    lead = db.get(Lead, deal.lead_id)
    if lead is not None:
        lead.status = payload.stage

    db.commit()
    db.refresh(deal)

    logger.info(
        "deal stage lead=%s deal=%s %s -> %s", deal.lead_id, deal.id, previous, deal.stage
    )
    return deal
