"""Builds the controlled context sent to the LLM.

Deliberately narrow: only the fields a sales rep would actually summarize.
No ids, no internal timestamps, no raw ORM objects.
"""

from pydantic import BaseModel

from app.models import Lead

MAX_ACTIVITIES = 5
MAX_ACTIVITY_CHARS = 300


class ActivityContext(BaseModel):
    date: str
    type: str
    content: str


class TaskContext(BaseModel):
    title: str
    due_date: str | None
    completed: bool


class LeadContext(BaseModel):
    name: str
    job_title: str | None
    company: str
    industry: str | None
    company_size: str | None
    location: str | None
    source: str | None
    status: str
    deal_value: int | None
    deal_currency: str | None
    deal_stage: str | None
    activities: list[ActivityContext]
    tasks: list[TaskContext]

    def to_prompt_text(self) -> str:
        """Compact labelled block. Values only - never instructions."""
        lines = [
            "Lead:",
            f"{self.name}",
            f"{self.job_title or 'Job title unknown'} at {self.company}",
            f"Status: {self.status}",
            f"Source: {self.source or 'unknown'}",
            "",
            "Company:",
            f"{self.industry or 'Industry unknown'}",
            f"{self.company_size or 'Company size unknown'} employees",
            f"{self.location or 'Location unknown'}",
            "",
            "Deal:",
        ]

        if self.deal_stage:
            value = (
                f"{self.deal_currency} {self.deal_value:,}"
                if self.deal_value is not None
                else "Value unknown"
            )
            lines += [value, f"Stage: {self.deal_stage}"]
        else:
            lines.append("No deal recorded.")

        lines += ["", "Recent activity:"]
        if self.activities:
            lines += [
                f"- {a.date}: {a.type.title()} — {a.content}" for a in self.activities
            ]
        else:
            lines.append("- None recorded.")

        open_tasks = [t for t in self.tasks if not t.completed]
        done_tasks = [t for t in self.tasks if t.completed]

        lines += ["", "Open tasks:"]
        lines += (
            [f"- {t.title} — due {t.due_date or 'no date'}" for t in open_tasks]
            or ["- None."]
        )

        lines += ["", "Completed tasks:"]
        lines += [f"- {t.title}" for t in done_tasks] or ["- None."]

        return "\n".join(lines)


def build_lead_context(lead: Lead) -> LeadContext:
    recent = sorted(lead.activities, key=lambda a: a.created_at, reverse=True)[
        :MAX_ACTIVITIES
    ]

    return LeadContext(
        name=lead.full_name,
        job_title=lead.job_title,
        company=lead.company,
        industry=lead.industry,
        company_size=lead.company_size,
        location=lead.location,
        source=lead.source,
        status=lead.status,
        deal_value=lead.deal.value if lead.deal else None,
        deal_currency=lead.deal.currency if lead.deal else None,
        deal_stage=lead.deal.stage if lead.deal else None,
        activities=[
            ActivityContext(
                date=a.created_at.strftime("%b %d"),
                type=a.type,
                content=a.content[:MAX_ACTIVITY_CHARS],
            )
            for a in recent
        ],
        tasks=[
            TaskContext(
                title=t.title,
                due_date=t.due_date.isoformat() if t.due_date else None,
                completed=t.completed,
            )
            for t in lead.tasks
        ],
    )
