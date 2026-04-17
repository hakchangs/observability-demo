//
// 서버사이드 instrumentation 설정
//
import log from "loglevel";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    // loglevel bridge
    const { setupLogBridge } = await import('./utils/otel/logger.server');
    setupLogBridge();

    // Span 생성시 baggage 를 Span attribute 저장
    const { trace } = await import('@opentelemetry/api');
    const { BaggageToAttributesProcessor } = await import('./utils/otel/baggage-span-processor');

    // K8s Operator 주입 provider는 ProxyTracerProvider로 래핑되어 있어
    // 타입 정보 없이 내부 delegate에 접근해야 함
    const proxy = trace.getTracerProvider() as unknown as Record<string, unknown>;
    const provider = (
        typeof proxy['getDelegate'] === 'function'
            ? (proxy['getDelegate'] as () => unknown)()
            : proxy['_delegate'] ?? proxy
    ) as Record<string, unknown> | undefined;

    if (typeof provider?.['addSpanProcessor'] === 'function') {
        console.log("instrumentation BaggageToAttributesProcessor registered...");
        (provider['addSpanProcessor'] as (p: unknown) => void)(new BaggageToAttributesProcessor());
    } else {
        console.log("instrumentation addSpanProcessor not found on provider...", {provider});
    }
  }
}