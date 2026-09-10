from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    job_title: Mapped[str | None] = mapped_column(String(120))
    company: Mapped[str] = mapped_column(String(160), index=True)
    email: Mapped[str] = mapped_column(String(200), index=True)
    phone: Mapped[str | None] = mapped_column(String(40))
    source: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    industry: Mapped[str | None] = mapped_column(String(120))
    company_size: Mapped[str | None] = mapped_column(String(40))
    location: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    deal: Mapped["Deal | None"] = relationship(  # noqa: F821
        back_populates="lead", uselist=False, cascade="all, delete-orphan"
    )
    activities: Mapped[list["Activity"]] = relationship(  # noqa: F821
        back_populates="lead", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        back_populates="lead", cascade="all, delete-orphan"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
