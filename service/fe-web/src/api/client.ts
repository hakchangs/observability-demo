import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('fe-web');
const getToken = () => localStorage.getItem('token');

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? 'GET';

  return tracer.startActiveSpan(`${method} ${url}`, { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttribute('http.method', method);
    span.setAttribute('http.url', url);

    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      span.setAttribute('http.status_code', res.status);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw Object.assign(new Error(err.message || '요청 실패'), { status: res.status });
      }
      span.setStatus({ code: SpanStatusCode.OK });
      return res.json();
    } catch (err) {
      if (!(err instanceof Error && 'status' in err)) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      }
      throw err;
    } finally {
      span.end();
    }
  });
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
};