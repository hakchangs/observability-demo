import logging
import time

from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)

MAX_BODY_SIZE = 10_000  # 10KB 초과 시 truncate


class HttpLoggingMiddleware:
    """HTTP 요청/응답 메타 + body 로깅"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "")
        path = scope.get("path", "")
        query = scope.get("query_string", b"").decode()
        url = f"{path}?{query}" if query else path

        req_headers = self._parse_headers(scope.get("headers", []))
        req_body = await self._read_body(receive)
        req_body_text = self._decode(req_body)

        logger.info(
            "req=" + req_body_text,
            extra={
                "log_category": "app",
                "log_type": "http",
                "http.event": "request",
                "http.method": method,
                "http.url": url,
                "http.request.headers": req_headers,
            },
        )

        status_code = 0
        res_chunks: list[bytes] = []
        res_headers: dict[str, str] = {}

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code, res_headers
            if message["type"] == "http.response.start":
                status_code = message.get("status", 0)
                res_headers = self._parse_headers(message.get("headers", []))
            elif message["type"] == "http.response.body":
                res_chunks.append(message.get("body", b""))
            await send(message)

        start = time.perf_counter()
        await self.app(scope, self._replay(req_body), send_wrapper)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)

        res_body_text = self._decode(b"".join(res_chunks))

        logger.info(
            "res=" + res_body_text,
            extra={
                "log_category": "app",
                "log_type": "http",
                "http.event": "response",
                "http.method": method,
                "http.url": url,
                "http.status_code": status_code,
                "http.duration_ms": duration_ms,
                "http.response.headers": res_headers,
            },
        )

    async def _read_body(self, receive: Receive) -> bytes:
        chunks: list[bytes] = []
        while True:
            message = await receive()
            chunks.append(message.get("body", b""))
            if not message.get("more_body", False):
                break
        return b"".join(chunks)

    def _replay(self, body: bytes) -> Receive:
        sent = False

        async def receive() -> dict:
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            return {"type": "http.disconnect"}

        return receive

    def _parse_headers(self, raw: list) -> str:
        return ", ".join(f"{k.decode()}={v.decode()}" for k, v in raw)

    def _decode(self, data: bytes) -> str:
        if not data:
            return ""
        text = data[:MAX_BODY_SIZE].decode("utf-8", errors="replace")
        return text + " ...[truncated]" if len(data) > MAX_BODY_SIZE else text