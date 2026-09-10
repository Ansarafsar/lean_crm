from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.lead import utcnow


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(240))
    due_date: Mapped[date | None] = mapped_column(Date)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    lead: Mapped["Lead"] = relationship(back_populates="tasks")  # noqa: F821
