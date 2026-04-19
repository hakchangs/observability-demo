import logging
import os

from fastapi import APIRouter

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "redis-master")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_USERNAME = os.getenv("KAFKA_USERNAME", "user1")
KAFKA_PASSWORD = os.getenv("KAFKA_PASSWORD", "plCxJVIBcH")
SQLITE_PATH = os.getenv("SQLITE_PATH", "/tmp/be-report.db")

router = APIRouter(tags=["sample"])


# ── DB ──────────────────────────────────────────────────────────────────────

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import select

engine = create_async_engine(f"sqlite+aiosqlite:///{SQLITE_PATH}", echo=False)


class Base(DeclarativeBase):
    pass


class SampleRecord(Base):
    __tablename__ = "sample"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    message: Mapped[str]


@router.get("/ping")
async def ping():
    logger.info("ping started...")
    return {"ping": "pong"}


# ── RDB ────────────────────────────────────────────────────────────────────

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@router.get("/db")
async def sample_db():
    await init_db()
    async with AsyncSession(engine) as session:
        session.add(SampleRecord(message="hello from be-report"))
        await session.commit()

        result = await session.execute(select(SampleRecord).order_by(SampleRecord.id.desc()).limit(5))
        rows = result.scalars().all()
        logger.info("DB sample: inserted and fetched %d rows", len(rows))
        return {"rows": [{"id": r.id, "message": r.message} for r in rows]}


# ── Redis ────────────────────────────────────────────────────────────────────

import redis.asyncio as aioredis


@router.get("/redis")
async def sample_redis():
    client = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    try:
        await client.set("be-report:sample", "hello from be-report", ex=60)
        value = await client.get("be-report:sample")
        logger.info("Redis sample: set and got value=%s", value)
        return {"key": "be-report:sample", "value": value}
    finally:
        await client.aclose()


# ── Kafka ────────────────────────────────────────────────────────────────────

from aiokafka import AIOKafkaProducer


@router.get("/kafka")
async def sample_kafka():
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        security_protocol="SASL_PLAINTEXT",
        sasl_mechanism="PLAIN",
        sasl_plain_username=KAFKA_USERNAME,
        sasl_plain_password=KAFKA_PASSWORD,
    )
    await producer.start()
    try:
        message = b"hello from be-report"
        await producer.send_and_wait("be-report-sample", message)
        logger.info("Kafka sample: sent message to topic be-report-sample")
        return {"topic": "be-report-sample", "message": message.decode()}
    finally:
        await producer.stop()