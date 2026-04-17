//
// 서버사이드 instrumentation 설정
//
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    // loglevel bridge
    const { setupLogBridge } = await import('./utils/otel/logger.server');
    setupLogBridge();

    // root span 캡처 processor 등록
    // - _spanProcessors 배열에 직접 push (addSpanProcessor는 prototype 접근 문제로 동작 안함)
    // - MultiSpanProcessor가 같은 배열 참조를 순회하므로 정상 호출됨
    const { trace } = await import('@opentelemetry/api');
    const { captureIfRoot, getRootSpan, releaseRootSpan } = await import('./utils/otel/root-span-store');
    const p = trace.getTracerProvider() as any;
    const provider = p?._delegate ?? p;
    const spanProcessors: any[] = provider?._activeSpanProcessor?._spanProcessors;
    if (Array.isArray(spanProcessors)) {
        spanProcessors.push({
            onStart(span: any) { captureIfRoot(span); },
            onEnd(span: any)   {
                // root span 자신이 끝날 때만 삭제 (child span 종료 시 삭제 방지)
                const traceId = span.spanContext?.().traceId;
                const spanId  = span.spanContext?.().spanId;
                if (getRootSpan(traceId)?.spanContext?.().spanId === spanId) {
                    releaseRootSpan(traceId);
                }
            },
            forceFlush: () => Promise.resolve(),
            shutdown:   () => Promise.resolve(),
        });
    }

      // global fetch 패치: 모든 SSR fetch 호출에 baggage 헤더 자동 주입
      // - middleware 가 request 헤더에 주입한 baggage(guid 포함)를 next/headers 로 읽어 전달
      // - 개별 SSR 페이지/함수 수정 없이 공통 처리
      const originalFetch = globalThis.fetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = async function patchedFetch(
          input: RequestInfo | URL,
          init?: RequestInit,
      ) {
          try {
              const { headers } = await import('next/headers');
              const reqHeaders = await headers();
              const baggage = reqHeaders.get('baggage');
              if (baggage) {
                  const outHeaders = new Headers(init?.headers);
                  if (!outHeaders.has('baggage')) {
                      outHeaders.set('baggage', baggage);
                  }
                  return originalFetch(input, { ...init, headers: outHeaders });
              }
          } catch {
              // request context 외부(헬스체크, 초기화 등)에서는 그냥 통과
          }
          return originalFetch(input, init);
      };
  }
}