### GUID 전파

작업내용
- GUID baggage 전파 및 span 저장 설정

> 적용 Stack: FastAPI + logging

##### 1. 라이브러리 추가
```bash
pip install opentelemetry-api==1.41.0
```

##### 2. guid 생성기 및 주입 로직 추가
```python
# app/otel/guid.py

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
```

##### 3. middleware + logging filter 추가
```python
# app/otel/baggage.py

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
```

##### 4. main.py 에 middleware + logging filter 설정
```python
# app/main.py

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .otel.baggage import BaggageLoggingFilter, BaggageToSpanMiddleware
from .otel.guid import GuidBaggageMiddleware
from .routers import report, sample


@asynccontextmanager
async def lifespan(app):
    ### logging 공통 설정
    root_logger = logging.getLogger()
    # 로그레벨 변경: 기본=WARN
    root_logger.setLevel(logging.INFO)
    baggage_filter = BaggageLoggingFilter()
    # root logger handler 에 필터 등록
    for handler in root_logger.handlers:
        handler.addFilter(baggage_filter)
    yield


app = FastAPI(title="be-report", version="1.0.0", lifespan=lifespan)
app.add_middleware(BaggageToSpanMiddleware)  # 2번째 실행
app.add_middleware(GuidBaggageMiddleware)    # 1번째 실행


# sample code
app.include_router(sample.router, prefix="/api/sample")
```

##### 5. 테스트 코드 작성
```python
# app/routers/sample.py

import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sample"])

@router.get("/ping")
async def ping():
    logger.info("ping started...")
    return {"ping": "pong"}
```

##### 6. 확인
1. curl localhost:8000/api/sample/ping
2. (Grafana) Trace > 해당 추적 탐색 > span attribute guid 확인 > 정상
3. (Grafana) Log > 해당 로그 탐색 > structured metadata guid 확인 > 정상
