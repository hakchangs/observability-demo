import { NextRequest, NextResponse } from 'next/server';

// HTTP collector endpoint (port 4318) - separate from gRPC OTEL_EXPORTER_OTLP_ENDPOINT (4317)
const COLLECTOR_HTTP_URL = process.env.OTEL_COLLECTOR_HTTP_URL ?? 'http://localhost:4318';

export async function POST(req: NextRequest) {
  const body = await req.arrayBuffer();
  const res = await fetch(`${COLLECTOR_HTTP_URL}/v1/traces`, {
    method: 'POST',
    headers: {
      'Content-Type': req.headers.get('Content-Type') ?? 'application/x-protobuf',
    },
    body,
  });
  return new NextResponse(null, { status: res.status });
}
