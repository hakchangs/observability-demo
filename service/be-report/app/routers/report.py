import logging
import os
import random
import time
from datetime import datetime

import httpx
from fastapi import APIRouter, Request
from opentelemetry import baggage, context, metrics, trace
from opentelemetry.propagate import extract

logger = logging.getLogger(__name__)

tracer = trace.get_tracer("be-report")
meter = metrics.get_meter("be-report")

# ---- Custom metrics ----
report_counter = meter.create_counter(
    name="report.requests.total",
    description="Total number of report API calls",
    unit="1",
)
report_duration = meter.create_histogram(
    name="report.duration.ms",
    description="Time taken to generate a report",
    unit="ms",
)

SUBSCRIPTION_URL = os.getenv("SUBSCRIPTION_URL", "http://be-subscription:8080")
PRODUCT_URL = os.getenv("PRODUCT_URL", "http://be-product:8080")

router = APIRouter(tags=["report"])


def _extract_baggage(request: Request) -> dict:
    """W3C Baggage 에서 session.id / user.id 추출"""
    ctx = extract(dict(request.headers))
    token = context.attach(ctx)
    try:
        return {
            "session.id": baggage.get_baggage("session.id") or "",
            "user.id": baggage.get_baggage("user.id") or "",
        }
    finally:
        context.detach(token)


@router.get("/summary")
async def get_summary(request: Request):
    bag = _extract_baggage(request)
    report_type = "summary"

    with tracer.start_as_current_span("report.generate.summary") as span:
        span.set_attribute("report.type", report_type)
        if bag["user.id"]:
            span.set_attribute("user.id", bag["user.id"])
        if bag["session.id"]:
            span.set_attribute("session.id", bag["session.id"])

        report_counter.add(1, {"report.type": report_type})
        t0 = time.time()

        logger.info("Generating summary report [user=%s]", bag["user.id"] or "anonymous")

        subscriptions = await _fetch_subscriptions(span)
        products = await _fetch_products(span)

        total = len(subscriptions) if subscriptions else random.randint(80, 200)
        active = int(total * random.uniform(0.7, 0.9))
        product_count = len(products) if products else random.randint(5, 15)

        span.set_attribute("report.total_subscriptions", total)
        span.set_attribute("report.active_subscriptions", active)

        elapsed = (time.time() - t0) * 1000
        report_duration.record(elapsed, {"report.type": report_type})

        logger.info(
            "Summary report done: total=%d active=%d products=%d duration_ms=%.1f",
            total, active, product_count, elapsed,
        )

        return {
            "generatedAt": datetime.now().isoformat(),
            "totalSubscriptions": total,
            "activeSubscriptions": active,
            "cancelledSubscriptions": total - active,
            "newThisMonth": random.randint(5, 30),
            "productCount": product_count,
        }


@router.get("/subscriptions")
async def get_subscription_report(request: Request):
    bag = _extract_baggage(request)
    report_type = "subscriptions"

    with tracer.start_as_current_span("report.generate.subscriptions") as span:
        span.set_attribute("report.type", report_type)
        if bag["user.id"]:
            span.set_attribute("user.id", bag["user.id"])

        report_counter.add(1, {"report.type": report_type})
        t0 = time.time()

        logger.info("Generating subscription report")

        subscriptions = await _fetch_subscriptions(span)

        # 월별 집계 시뮬레이션
        months = ["2026-01", "2026-02", "2026-03", "2026-04"]
        monthly = [
            {"month": m, "count": random.randint(10, 50), "cancelled": random.randint(1, 10)}
            for m in months
        ]

        elapsed = (time.time() - t0) * 1000
        report_duration.record(elapsed, {"report.type": report_type})

        span.set_attribute("report.months_covered", len(months))

        return {
            "generatedAt": datetime.now().isoformat(),
            "totalFetched": len(subscriptions) if subscriptions else 0,
            "monthly": monthly,
        }


@router.get("/products")
async def get_product_report(request: Request):
    bag = _extract_baggage(request)
    report_type = "products"

    with tracer.start_as_current_span("report.generate.products") as span:
        span.set_attribute("report.type", report_type)
        if bag["user.id"]:
            span.set_attribute("user.id", bag["user.id"])

        report_counter.add(1, {"report.type": report_type})
        t0 = time.time()

        logger.info("Generating product report")

        products = await _fetch_products(span)

        result = [
            {
                "productId": p.get("productId", i + 1),
                "productName": p.get("productName", f"상품 {i + 1}"),
                "subscriptionCount": random.randint(5, 100),
                "revenue": random.randint(10_000, 500_000),
            }
            for i, p in enumerate(products or [{"productId": i} for i in range(5)])
        ]

        elapsed = (time.time() - t0) * 1000
        report_duration.record(elapsed, {"report.type": report_type})

        span.set_attribute("report.product_count", len(result))

        return {
            "generatedAt": datetime.now().isoformat(),
            "products": result,
        }


async def _fetch_subscriptions(parent_span: trace.Span) -> list:
    with tracer.start_as_current_span("downstream.get_subscriptions") as span:
        span.set_attribute("peer.service", "be-subscription")
        span.set_attribute("http.url", f"{SUBSCRIPTION_URL}/api/subscriptions")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{SUBSCRIPTION_URL}/api/subscriptions")
                span.set_attribute("http.status_code", resp.status_code)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(trace.StatusCode.ERROR, str(exc))
            logger.warning("Could not reach be-subscription: %s", exc)
    return []


async def _fetch_products(parent_span: trace.Span) -> list:
    with tracer.start_as_current_span("downstream.get_products") as span:
        span.set_attribute("peer.service", "be-product")
        span.set_attribute("http.url", f"{PRODUCT_URL}/api/products")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{PRODUCT_URL}/api/products")
                span.set_attribute("http.status_code", resp.status_code)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(trace.StatusCode.ERROR, str(exc))
            logger.warning("Could not reach be-product: %s", exc)
    return []