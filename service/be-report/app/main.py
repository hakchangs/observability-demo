from fastapi import FastAPI
from .routers import report

app = FastAPI(title="be-report", version="1.0.0")


@app.get("/actuator/health", tags=["health"])
def health():
    return {"status": "UP"}


app.include_router(report.router, prefix="/api/report")