//
// 서버사이드 instrumentation 설정
//
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    // loglevel bridge
    const { setupLogBridge } = await import('./utils/otel/logger.server');
    setupLogBridge();

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