from .telemetry import setup_telemetry

# OTel 초기화 - 앱 구동 최초에 실행
setup_telemetry()

from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

from .routers import report

app = FastAPI(title="be-report", version="1.0.0")

# FastAPI / httpx 자동 instrumentation
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()


@app.get("/actuator/health", tags=["health"])
def health():
    return {"status": "UP"}


app.include_router(report.router, prefix="/api/report")