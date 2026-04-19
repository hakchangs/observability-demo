from opentelemetry import baggage, context, trace
from starlette.types import ASGIApp, Receive, Scope, Send

from .guid import generate_guid


class BaggageToSpanMiddleware:
    """W3C Baggage 전체를 span attribute 에 저장. guid 없으면 생성하여 baggage 에 추가."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            entries = dict(baggage.get_all())
            if "guid" not in entries:
                entries["guid"] = generate_guid()

            ctx = context.get_current()
            for key, value in entries.items():
                ctx = baggage.set_baggage(key, value, ctx)

            token = context.attach(ctx)
            try:
                span = trace.get_current_span()
                if span.is_recording():
                    for key, value in entries.items():
                        span.set_attribute(key, value)
                await self.app(scope, receive, send)
            finally:
                context.detach(token)
            return

        await self.app(scope, receive, send)