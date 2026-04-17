//
// 서버사이드 instrumentation 설정
//
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    // loglevel bridge
    const { setupLogBridge } = await import('./utils/otel/logger.server');
    setupLogBridge();

    // override fetch() > baggage header 추가
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