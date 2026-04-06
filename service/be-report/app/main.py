import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .routers import report


@asynccontextmanager
async def lifespan(app):
    # uvicorn sets propagate=False on its loggers by default.
    # Re-enable propagation so logs reach the OTel LoggingHandler on root logger.
    logging.getLogger("uvicorn").propagate = True
    logging.getLogger("uvicorn.access").propagate = True
    logging.getLogger("uvicorn.error").propagate = True
    yield


app = FastAPI(title="be-report", version="1.0.0", lifespan=lifespan)


@app.get("/actuator/health", tags=["health"])
def health():
    return {"status": "UP"}


app.include_router(report.router, prefix="/api/report")
