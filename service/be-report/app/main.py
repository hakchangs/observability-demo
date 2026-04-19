import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .middleware.otel_baggage import BaggageLoggingFilter, BaggageToSpanMiddleware
from .routers import report, sample


@asynccontextmanager
async def lifespan(app):
    ### 로그레벨 변경: 기본=WARN
    logging.getLogger().setLevel(logging.INFO)
    logging.getLogger().addFilter(BaggageLoggingFilter())
    ### uvicorn 로그 (ex. /actuator/heath 호출 로그) 출력설정
    # uvicorn sets propagate=False on its loggers by default.
    # Re-enable propagation so logs reach the OTel LoggingHandler on root logger.
    # logging.getLogger("uvicorn").propagate = True
    # logging.getLogger("uvicorn.access").propagate = True
    # logging.getLogger("uvicorn.error").propagate = True
    yield


app = FastAPI(title="be-report", version="1.0.0", lifespan=lifespan)
app.add_middleware(BaggageToSpanMiddleware)


@app.get("/actuator/health", tags=["health"])
def health():
    return {"status": "UP"}


app.include_router(report.router, prefix="/api/report")
app.include_router(sample.router, prefix="/api/sample")
