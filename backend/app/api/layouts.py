from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import SessionDependency
from app.models import Layout
from app.schemas.layout import LayoutCreate, LayoutRead, LayoutUpdate
from app.services import layout_service

router = APIRouter(prefix="/api/layouts", tags=["layouts"])


def _get_layout(session: SessionDependency, layout_id: int) -> Layout:
    layout = session.get(Layout, layout_id)
    if layout is None:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout


@router.get("", response_model=list[LayoutRead])
def get_layouts(session: SessionDependency) -> list[object]:
    return list(layout_service.list_layouts(session))


@router.post("", response_model=LayoutRead, status_code=status.HTTP_201_CREATED)
def post_layout(data: LayoutCreate, session: SessionDependency) -> object:
    return layout_service.create_layout(session, data)


@router.get("/{layout_id}", response_model=LayoutRead)
def get_layout(layout_id: int, session: SessionDependency) -> object:
    return _get_layout(session, layout_id)


@router.patch("/{layout_id}", response_model=LayoutRead)
def patch_layout(layout_id: int, data: LayoutUpdate, session: SessionDependency) -> object:
    return layout_service.update_layout(session, _get_layout(session, layout_id), data)


@router.delete("/{layout_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_layout(layout_id: int, session: SessionDependency) -> Response:
    session.delete(_get_layout(session, layout_id))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
