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

    const proxy = trace.getTracerProvider();
    const provider = proxy.getDelegate()?.() ?? proxy._delegate ?? proxy;
    if (typeof provider?.addSpanProcessor === 'function') {
        provider.addSpanProcessor(new BaggageToAttributesProcessor());
    }
  }
}