from fastapi import Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lead


def get_lead_or_404(
    lead_id: int = Path(..., ge=1), db: Session = Depends(get_db)
) -> Lead:
    """Nested routes resolve the parent first, so a bad lead_id is a clean 404
    rather than a foreign-key error."""
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found.")
    return lead
