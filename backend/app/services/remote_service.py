from __future__ import annotations

import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Command, Remote
from app.schemas.command import CommandCreate, CommandUpdate
from app.schemas.remote import RemoteCreate, RemoteUpdate


class ConflictError(ValueError):
    pass


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    if not slug:
        raise ValueError("A slug must contain at least one letter or number")
    return slug[:120]


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise ConflictError("That slug is already in use") from error


def list_remotes(session: Session) -> list[Remote]:
    return list(session.scalars(select(Remote).order_by(Remote.name)))


def get_remote(session: Session, remote_id: int) -> Remote | None:
    return session.get(Remote, remote_id)


def get_remote_by_slug(session: Session, slug: str) -> Remote | None:
    return session.scalar(select(Remote).where(Remote.slug == slug))


def create_remote(session: Session, data: RemoteCreate) -> Remote:
    remote = Remote(
        name=data.name,
        slug=slugify(data.slug or data.name),
        description=data.description,
        layout=data.layout,
    )
    session.add(remote)
    _commit(session)
    session.refresh(remote)
    return remote


def update_remote(session: Session, remote: Remote, data: RemoteUpdate) -> Remote:
    changes = data.model_dump(exclude_unset=True)
    if "slug" in changes:
        changes["slug"] = slugify(changes["slug"])
    if "name" in changes:
        changes["name"] = changes["name"].strip()
    for field, value in changes.items():
        setattr(remote, field, value)
    _commit(session)
    session.refresh(remote)
    return remote


def delete_remote(session: Session, remote: Remote) -> None:
    session.delete(remote)
    _commit(session)


def list_commands(session: Session, remote_id: int) -> list[Command]:
    return list(
        session.scalars(
            select(Command).where(Command.remote_id == remote_id).order_by(Command.name)
        )
    )


def get_command(session: Session, command_id: int) -> Command | None:
    return session.get(Command, command_id)


def get_command_by_slugs(session: Session, remote_slug: str, command_slug: str) -> Command | None:
    return session.scalar(
        select(Command).join(Remote).where(Remote.slug == remote_slug, Command.slug == command_slug)
    )


def create_command(session: Session, remote_id: int, data: CommandCreate) -> Command:
    item = Command(
        remote_id=remote_id,
        name=data.name.strip(),
        slug=slugify(data.slug or data.name),
        protocol=data.protocol,
        address=data.address,
        command=data.command,
        carrier_frequency=data.carrier_frequency,
        raw_signal=data.raw_signal,
    )
    session.add(item)
    _commit(session)
    session.refresh(item)
    return item


def update_command(session: Session, item: Command, data: CommandUpdate) -> Command:
    changes = data.model_dump(exclude_unset=True)
    if "slug" in changes:
        changes["slug"] = slugify(changes["slug"])
    if "name" in changes:
        changes["name"] = changes["name"].strip()
    for field, value in changes.items():
        setattr(item, field, value)
    _commit(session)
    session.refresh(item)
    return item


def delete_command(session: Session, item: Command) -> None:
    session.delete(item)
    _commit(session)
