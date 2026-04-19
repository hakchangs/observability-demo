import random
from datetime import datetime

from opentelemetry import baggage, context
from starlette.types import ASGIApp, Scope, Receive, Send

SYSTEM_CODE = "LTP"


def _generate_guid() -> str:
    now = datetime.now()
    timestamp = now.strftime("%Y%m%d%H%M%S") + f"{now.microsecond // 1000:03d}"
    rand = str(random.randint(0, 9_999_999_999)).zfill(10)
    return f"{timestamp}{SYSTEM_CODE}{rand}"


class GuidBaggageMiddleware:
    """guid 없으면 생성하여 baggage 에 주입"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and not baggage.get_baggage("guid"):
            ctx = baggage.set_baggage("guid", _generate_guid())
            token = context.attach(ctx)
            try:
                await self.app(scope, receive, send)
            finally:
                context.detach(token)
            return

        await self.app(scope, receive, send)
