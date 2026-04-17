// traceId 기준으로 root span(HTTP 최상위 span)을 저장/조회
// - SpanProcessor의 onStart에서 최초 span을 캡처
// - layout.tsx에서 traceId로 조회해 guid attribute 저장
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, any>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function captureIfRoot(span: any): void {
    const traceId = span.spanContext?.().traceId;
    if (traceId && !store.has(traceId)) {
        store.set(traceId, span);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRootSpan(traceId: string): any {
    return store.get(traceId);
}

export function releaseRootSpan(traceId: string): void {
    store.delete(traceId);
}