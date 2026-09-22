import json

from sqlalchemy import insert, inspect
from sqlalchemy.engine import Connection

from app.models import Layout


def migrate(connection: Connection) -> None:
    columns = {column["name"] for column in inspect(connection).get_columns("commands")}
    if "role" not in columns:
        connection.exec_driver_sql("ALTER TABLE commands ADD COLUMN role VARCHAR(40)")
    if "button_text" not in columns:
        connection.exec_driver_sql("ALTER TABLE commands ADD COLUMN button_text VARCHAR(120)")

    connection.exec_driver_sql(
        "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)"
    )
    migrated = connection.exec_driver_sql(
        "SELECT 1 FROM schema_migrations WHERE name = 'separate_layouts'"
    ).first()
    if migrated:
        return

    remote_columns = {column["name"] for column in inspect(connection).get_columns("remotes")}
    if "layout" in remote_columns:
        remotes = (
            connection.exec_driver_sql(
                "SELECT name, description, layout FROM remotes WHERE layout IS NOT NULL"
            )
            .mappings()
            .all()
        )
        for remote in remotes:
            data = json.loads(remote["layout"])
            if isinstance(data, dict) and isinstance(data.get("rows"), list):
                connection.execute(
                    insert(Layout).values(
                        name=remote["name"], description=remote["description"], rows=data["rows"]
                    )
                )
    connection.exec_driver_sql("INSERT INTO schema_migrations (name) VALUES ('separate_layouts')")
