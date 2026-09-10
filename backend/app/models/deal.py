from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.lead import utcnow


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[int] = mapped_column(primary_key=True)
    # One deal per lead, enforced at the DB level.
    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), index=True, unique=True
    )
    name: Mapped[str] = mapped_column(String(160))
    value: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    stage: Mapped[str] = mapped_column(String(20), default="new")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    lead: Mapped["Lead"] = relationship(back_populates="deal")  # noqa: F821
