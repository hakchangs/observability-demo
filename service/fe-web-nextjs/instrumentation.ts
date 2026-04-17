//
// 서버사이드 instrumentation 설정
//
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    // loglevel bridge
    const { setupLogBridge } = await import('./utils/otel/logger.server');
    setupLogBridge();

    // Span 생성시 baggage 를 Span attribute 저장
    const { trace } = await import('@opentelemetry/api');
    const { BaggageToAttributesProcessor } = await import('./utils/otel/baggage-span-processor');

    // K8s Operator 주입 provider는 ProxyTracerProvider로 래핑되어 있어
    // Record<string, unknown> 캐스팅시 prototype 메서드를 인식 못하므로 any 타입으로 접근
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = trace.getTracerProvider() as any;
    const provider = p?.getDelegate?.() ?? p?._delegate ?? p;
    provider?.addSpanProcessor?.(new BaggageToAttributesProcessor());
    console.log('[instrumentation] BaggageToAttributesProcessor registered:', !!provider?.addSpanProcessor);
  }
}