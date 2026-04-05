import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.BFF_URL ?? 'http://localhost:8880';

async function proxy(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
): Promise<NextResponse> {
  const { path } = await params;
  const search = request.nextUrl.search;
  const url = `${BFF_URL}/api/${path.join('/')}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'connection') {
      headers.set(key, value);
    }
  });

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    ...(hasBody ? { body: request.body, duplex: 'half' } : {}),
  } as RequestInit);

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, params);
}