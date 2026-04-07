import { NextRequest, NextResponse } from 'next/server';

const COLLECTOR_HTTP_URL = process.env.OTEL_COLLECTOR_HTTP_URL ?? 'http://localhost:4318';

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer();
  const res = await fetch(`${COLLECTOR_HTTP_URL}/v1/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('Content-Type') ?? 'application/x-protobuf',
    },
    body,
  });
  return new NextResponse(null, { status: res.status });
}