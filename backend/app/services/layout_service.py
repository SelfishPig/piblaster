from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Layout
from app.schemas.layout import LayoutCreate, LayoutUpdate


def list_layouts(session: Session) -> list[Layout]:
    return list(session.scalars(select(Layout).order_by(Layout.name, Layout.id)))


def create_layout(session: Session, data: LayoutCreate) -> Layout:
    layout = Layout(
        name=data.name,
        description=data.description,
        rows=[row.model_dump(by_alias=True, exclude_none=True) for row in data.rows],
    )
    session.add(layout)
    session.commit()
    session.refresh(layout)
    return layout


def update_layout(session: Session, layout: Layout, data: LayoutUpdate) -> Layout:
    changes = data.model_dump(exclude_unset=True)
    if data.rows is not None:
        changes["rows"] = [row.model_dump(by_alias=True, exclude_none=True) for row in data.rows]
    for field, value in changes.items():
        setattr(layout, field, value)
    session.commit()
    session.refresh(layout)
    return layout


def clear_commands(session: Session, command_ids: set[int]) -> None:
    if not command_ids:
        return
    for layout in list_layouts(session):
        rows = [
            {
                **row,
                "controls": [
                    {**control, "commandId": None}
                    if control.get("commandId") in command_ids
                    else control
                    for control in row["controls"]
                ],
            }
            for row in layout.rows
        ]
        if rows != layout.rows:
            layout.rows = rows
