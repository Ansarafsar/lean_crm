"""Seed the CRM with five deliberately uneven leads.

Uneven on purpose: the AI summary's "what's missing" section is only
meaningful if some leads are well documented and others are not.

Usage:
    python seed.py           # no-op if data already exists
    python seed.py --force   # wipe and reseed
"""

import sys
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import Activity, Deal, Lead, Task  # noqa: E402

TODAY = datetime.now(timezone.utc).replace(microsecond=0)


def days_ago(n: int) -> datetime:
    return TODAY - timedelta(days=n)


def days_ahead(n: int) -> date:
    return (TODAY + timedelta(days=n)).date()


LEADS = [
    {
        "lead": dict(
            first_name="Sarah",
            last_name="Chen",
            job_title="VP of Operations",
            company="Acme Analytics",
            email="sarah@acme.example",
            phone="+1 555 0100",
            source="Website",
            status="qualified",
            industry="B2B SaaS",
            company_size="51-200",
            location="New York",
            created_at=days_ago(21),
        ),
        # Rich history, clear pain point, but budget/timeline/decision maker
        # are all absent - the AI should call those out.
        "deal": dict(
            name="Acme Analytics - Reporting Automation",
            value=18000,
            currency="USD",
            stage="proposal",
        ),
        "activities": [
            ("meeting", "Discovery meeting. Walked through their current reporting workflow - three analysts spend roughly two days a week assembling the same board deck by hand.", 12),
            ("email", "Sent product overview and the reporting automation one-pager.", 9),
            ("call", "Follow-up call. Sarah confirmed interest in reducing manual reporting and asked what a rollout would look like for a team of twelve.", 4),
        ],
        "tasks": [
            ("Send pricing proposal", days_ahead(1), False),
            ("Discovery call", days_ahead(-8), True),
        ],
    },
    {
        "lead": dict(
            first_name="Arjun",
            last_name="Mehta",
            job_title="Head of Sales",
            company="Northstar Labs",
            email="arjun@northstar.example",
            phone="+1 555 0142",
            source="Inbound demo request",
            status="contacted",
            industry="SaaS",
            company_size="11-50",
            location="Austin",
            created_at=days_ago(14),
        ),
        "deal": dict(
            name="Northstar Labs - Pipeline Visibility",
            value=8000,
            currency="USD",
            stage="contacted",
        ),
        "activities": [
            ("note", "Inbound demo request submitted through the pricing page.", 11),
            ("email", "Initial outreach email sent. No response yet.", 8),
        ],
        "tasks": [],
    },
    {
        "lead": dict(
            first_name="Priya",
            last_name="Nair",
            job_title="COO",
            company="GreenGrid",
            email="priya@greengrid.example",
            phone="+1 555 0188",
            source="Referral",
            status="proposal",
            industry="Climate Tech",
            company_size="201-500",
            location="San Francisco",
            created_at=days_ago(30),
        ),
        "deal": dict(
            name="GreenGrid - Operations Rollout",
            value=24000,
            currency="USD",
            stage="proposal",
        ),
        "activities": [
            ("meeting", "Discovery session with Priya and two ops leads.", 19),
            ("meeting", "Technical evaluation with their platform team. Asked about SSO and data residency.", 10),
            ("email", "Priya requested a formal proposal covering a phased rollout across two regions.", 3),
        ],
        "tasks": [
            ("Draft phased rollout proposal", days_ahead(4), False),
        ],
    },
    {
        "lead": dict(
            first_name="Daniel",
            last_name="Brooks",
            job_title="Director of IT",
            company="Vertex Systems",
            email="daniel@vertex.example",
            phone="+1 555 0170",
            source="Conference",
            status="new",
            industry="Enterprise Software",
            company_size="500+",
            location="Chicago",
            created_at=days_ago(3),
        ),
        # Almost no history on purpose: shows the AI honestly reporting that
        # most of what a rep needs is still unknown.
        "deal": dict(
            name="Vertex Systems - Enterprise Evaluation",
            value=35000,
            currency="USD",
            stage="new",
        ),
        "activities": [
            ("note", "Badge scan at the SaaS Ops conference booth. No conversation recorded.", 3),
        ],
        "tasks": [],
    },
    {
        "lead": dict(
            first_name="Maya",
            last_name="Patel",
            job_title="Operations Manager",
            company="BrightWorks",
            email="maya@brightworks.example",
            phone="+1 555 0155",
            source="Website",
            status="won",
            industry="Professional Services",
            company_size="51-200",
            location="Boston",
            created_at=days_ago(60),
        ),
        "deal": dict(
            name="BrightWorks - Annual Plan",
            value=12000,
            currency="USD",
            stage="won",
        ),
        "activities": [
            ("meeting", "Discovery call covering their client onboarding process.", 45),
            ("email", "Sent proposal for the annual plan.", 30),
            ("call", "Negotiated final terms. Agreed on annual billing with a Q1 start.", 20),
            ("note", "Contract signed. Kickoff scheduled with the customer success team.", 14),
        ],
        "tasks": [
            ("Send signed contract to finance", days_ahead(-12), True),
            ("Schedule onboarding kickoff", days_ahead(-10), True),
        ],
    },
]


def seed(force: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(Lead).count()

        if existing and not force:
            print(f"Database already has {existing} leads. Skipping seed.")
            print("Run 'python seed.py --force' to wipe and reseed.")
            return

        if existing:
            # Cascades clear activities, deals and tasks.
            for lead in db.query(Lead).all():
                db.delete(lead)
            db.commit()
            print(f"Removed {existing} existing leads.")

        for entry in LEADS:
            lead = Lead(**entry["lead"])
            db.add(lead)
            db.flush()  # assign lead.id

            db.add(Deal(lead_id=lead.id, **entry["deal"]))

            for activity_type, content, ago in entry["activities"]:
                db.add(
                    Activity(
                        lead_id=lead.id,
                        type=activity_type,
                        content=content,
                        created_at=days_ago(ago),
                    )
                )

            for title, due, completed in entry["tasks"]:
                db.add(
                    Task(
                        lead_id=lead.id,
                        title=title,
                        due_date=due,
                        completed=completed,
                        completed_at=days_ago(2) if completed else None,
                    )
                )

        db.commit()
        print(f"Seeded {len(LEADS)} leads with deals, activities and tasks.")

    finally:
        db.close()


if __name__ == "__main__":
    seed(force="--force" in sys.argv)
