import logging

from opentelemetry import baggage, trace
from starlette.types import ASGIApp, Receive, Scope, Send


class BaggageLoggingFilter(logging.Filter):
    """root logger handler 에 등록해 모든 log record 에 baggage 값 주입"""

    def filter(self, record: logging.LogRecord) -> bool:
        for key, value in baggage.get_all().items():
            setattr(record, key, value)
        return True


class BaggageToSpanMiddleware:
    """baggage 전체를 현재 span attribute 에 저장"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            span = trace.get_current_span()
            if span.is_recording():
                for key, value in baggage.get_all().items():
                    span.set_attribute(key, value)

        await self.app(scope, receive, send)