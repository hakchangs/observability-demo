import logging

from opentelemetry import baggage, context, trace
from starlette.types import ASGIApp, Receive, Scope, Send

from .guid import generate_guid


class BaggageLoggingFilter(logging.Filter):
    """모든 log record 에 baggage 값을 자동 주입 — 공통처리"""

    def filter(self, record: logging.LogRecord) -> bool:
        for key, value in baggage.get_all().items():
            setattr(record, key, value)
            setattr(record, "test-key", "test-value")
        return True


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