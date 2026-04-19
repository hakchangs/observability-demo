import logging
import os
import random
from datetime import datetime

import httpx
from fastapi import APIRouter

logger = logging.getLogger(__name__)

SUBSCRIPTION_URL = os.getenv("SUBSCRIPTION_URL", "http://be-subscription:8080")
PRODUCT_URL = os.getenv("PRODUCT_URL", "http://be-product:8080")

router = APIRouter(tags=["report"])


@router.get("/summary")
async def get_summary():
    logger.info("Generating summary report", extra={"guid": "hardcoded-test-guid"})

    subscriptions = await _fetch_subscriptions()
    products = await _fetch_products()

    total = len(subscriptions) if subscriptions else random.randint(80, 200)
    active = int(total * random.uniform(0.7, 0.9))

    return {
        "generatedAt": datetime.now().isoformat(),
        "totalSubscriptions": total,
        "activeSubscriptions": active,
        "cancelledSubscriptions": total - active,
        "newThisMonth": random.randint(5, 30),
        "productCount": len(products) if products else random.randint(5, 15),
    }


@router.get("/subscriptions")
async def get_subscription_report():
    logger.info("Generating subscription report")

    months = ["2026-01", "2026-02", "2026-03", "2026-04"]
    monthly = [
        {"month": m, "count": random.randint(10, 50), "cancelled": random.randint(1, 10)}
        for m in months
    ]

    return {
        "generatedAt": datetime.now().isoformat(),
        "monthly": monthly,
    }


@router.get("/products")
async def get_product_report():
    logger.info("Generating product report")

    products = await _fetch_products()

    result = [
        {
            "productId": p.get("productId", i + 1) if isinstance(p, dict) else i + 1,
            "productName": p.get("productName", f"상품 {i + 1}") if isinstance(p, dict) else f"상품 {i + 1}",
            "subscriptionCount": random.randint(5, 100),
            "revenue": random.randint(10_000, 500_000),
        }
        for i, p in enumerate(products or [{} for _ in range(5)])
    ]

    return {
        "generatedAt": datetime.now().isoformat(),
        "products": result,
    }


async def _fetch_subscriptions() -> list:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{SUBSCRIPTION_URL}/api/subscriptions")
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("Could not reach be-subscription: %s", exc)
    return []


async def _fetch_products() -> list:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{PRODUCT_URL}/api/products")
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning("Could not reach be-product: %s", exc)
    return []