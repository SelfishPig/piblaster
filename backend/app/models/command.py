from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base
from app.models.remote import now_utc

if TYPE_CHECKING:
    from app.models.remote import Remote


class Command(Base):
    __tablename__ = "commands"
    __table_args__ = (UniqueConstraint("remote_id", "slug", name="uq_command_remote_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    remote_id: Mapped[int] = mapped_column(ForeignKey("remotes.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(120))
    protocol: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address: Mapped[str | None] = mapped_column(String(80), nullable=True)
    command: Mapped[str | None] = mapped_column(String(80), nullable=True)
    carrier_frequency: Mapped[int] = mapped_column(default=38_000)
    raw_signal: Mapped[list[int]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)
    remote: Mapped[Remote] = relationship(back_populates="commands")
