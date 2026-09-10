import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Lead
from app.routes.deps import get_lead_or_404
from app.schemas.lead import LeadDetail, LeadListItem, LeadStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=list[LeadListItem])
def list_leads(
    search: str | None = Query(None, description="Name, company or email"),
    status: LeadStatus | None = Query(None),
    db: Session = Depends(get_db),
):
    stmt = select(Lead).options(
        selectinload(Lead.deal), selectinload(Lead.tasks)
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        # Bound parameters via SQLAlchemy, never string concatenation.
        stmt = stmt.where(
            or_(
                Lead.first_name.ilike(term),
                Lead.last_name.ilike(term),
                Lead.company.ilike(term),
                Lead.email.ilike(term),
            )
        )

    if status:
        stmt = stmt.where(Lead.status == status)

    leads = db.execute(stmt.order_by(Lead.created_at.desc())).scalars().all()

    items = []
    for lead in leads:
        open_due = sorted(
            (t.due_date for t in lead.tasks if not t.completed and t.due_date)
        )
        items.append(
            LeadListItem(
                **{
                    f: getattr(lead, f)
                    for f in (
                        "id",
                        "first_name",
                        "last_name",
                        "job_title",
                        "company",
                        "email",
                        "status",
                    )
                },
                deal_value=lead.deal.value if lead.deal else None,
                deal_currency=lead.deal.currency if lead.deal else None,
                deal_stage=lead.deal.stage if lead.deal else None,
                next_follow_up=open_due[0] if open_due else None,
            )
        )

    logger.info(
        "listed %d leads (search=%r status=%s)", len(items), search or "", status or "all"
    )
    return items


@router.get("/{lead_id}", response_model=LeadDetail)
def get_lead(lead: Lead = Depends(get_lead_or_404)):
    return lead
