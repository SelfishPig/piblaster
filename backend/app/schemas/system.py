from app.schemas.base import APIModel


class SystemStatus(APIModel):
    version: str
    ir_backend: str
    receiver_available: bool
    transmitter_available: bool
    learning: bool
    database: str
    uptime_seconds: int
