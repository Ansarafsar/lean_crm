import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.models import Lead
from app.routes.deps import get_lead_or_404
from app.schemas.summary import LeadSummary
from app.services.ai_summary import AISummaryError, generate_summary

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/leads", tags=["ai"])

# The UI switches its message on `code`, so each failure mode stays distinct.
STATUS_FOR_CODE = {
    "no_key": 503,
    "upstream": 502,
    "invalid_output": 502,
    "weak_output": 502,
}


@router.post("/{lead_id}/summary", response_model=LeadSummary)
def summarize_lead(lead: Lead = Depends(get_lead_or_404)):
    try:
        return generate_summary(lead)
    except AISummaryError as exc:
        return JSONResponse(
            status_code=STATUS_FOR_CODE.get(exc.code, 502),
            content={"detail": exc.message, "code": exc.code},
        )
