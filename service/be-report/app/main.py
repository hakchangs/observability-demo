import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .middleware.http_logging import HttpLoggingMiddleware
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

    ### uvicorn 로그 (ex. /actuator/heath 호출 로그) 출력설정
    # uvicorn sets propagate=False on its loggers by default.
    # Re-enable propagation so logs reach the OTel LoggingHandler on root logger.
    # logging.getLogger("uvicorn").propagate = True
    # logging.getLogger("uvicorn.access").propagate = True
    # logging.getLogger("uvicorn.error").propagate = True
    yield


app = FastAPI(title="be-report", version="1.0.0", lifespan=lifespan)
app.add_middleware(HttpLoggingMiddleware)     # 3번째 실행 (가장 안쪽)
app.add_middleware(BaggageToSpanMiddleware)  # 2번째 실행
app.add_middleware(GuidBaggageMiddleware)    # 1번째 실행


@app.get("/actuator/health", tags=["health"])
def health():
    return {"status": "UP"}


app.include_router(report.router, prefix="/api/report")
app.include_router(sample.router, prefix="/api/sample")
