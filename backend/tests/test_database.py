import json
import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import select

from app.db.database import Database
from app.models import Command, Layout
from app.schemas.command import CommandUpdate
from app.services.remote_service import update_command


@pytest.mark.parametrize("has_role", [False, True])
def test_existing_database_gets_command_appearance(tmp_path: Path, has_role: bool) -> None:
    path = tmp_path / "existing.db"
    with sqlite3.connect(path) as connection:
        connection.executescript("""
            CREATE TABLE remotes (
                id INTEGER PRIMARY KEY, name VARCHAR(120), slug VARCHAR(120),
                description TEXT, layout JSON, created_at DATETIME, updated_at DATETIME
            );
            CREATE TABLE commands (
                id INTEGER PRIMARY KEY, remote_id INTEGER, name VARCHAR(120), slug VARCHAR(120),
                protocol VARCHAR(80), address VARCHAR(80), command VARCHAR(80),
                carrier_frequency INTEGER, raw_signal JSON,
                created_at DATETIME, updated_at DATETIME
            );
            INSERT INTO remotes VALUES
                (1, 'TV', 'tv', NULL, NULL, '2026-01-01', '2026-01-01');
            INSERT INTO commands VALUES
                (1, 1, 'Power', 'power', NULL, NULL, NULL,
                 38000, '[9000, 4500]', '2026-01-01', '2026-01-01');
        """)
        connection.execute(
            "UPDATE remotes SET layout = ? WHERE id = 1",
            (
                json.dumps(
                    {
                        "version": 2,
                        "rows": [
                            {"id": "power", "type": "button-1", "controls": [{"commandId": 1}]}
                        ],
                    }
                ),
            ),
        )
        if has_role:
            connection.execute("ALTER TABLE commands ADD COLUMN role VARCHAR(40)")
            connection.execute("UPDATE commands SET role = 'custom'")

    database = Database(path)
    try:
        database.create_tables()
        database.create_tables()
        with database.session_factory() as session:
            command = session.get(Command, 1)
            assert command is not None
            layouts = list(session.scalars(select(Layout)))
            assert len(layouts) == 1
            assert layouts[0].name == "TV"
            assert layouts[0].rows[0]["controls"][0]["commandId"] == 1
            assert command.name == "Power"
            assert command.raw_signal == [9000, 4500]
            assert command.role == ("custom" if has_role else None)
            assert command.button_text is None
            update_command(session, command, CommandUpdate(role="none", button_text="Power"))
        database.create_tables()
        with database.session_factory() as session:
            command = session.get(Command, 1)
            assert command is not None
            assert command.role == "none"
            assert command.button_text == "Power"
            layout = session.scalar(select(Layout))
            assert layout is not None
            session.delete(layout)
            session.commit()
        database.create_tables()
        with database.session_factory() as session:
            assert session.scalar(select(Layout)) is None
    finally:
        database.close()
