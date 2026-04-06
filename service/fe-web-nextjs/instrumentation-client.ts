import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

console.log('[OTel] instrumentation-client: start');

const exporter = new OTLPTraceExporter({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  url: `${window.location.origin}/api/otlp/v1/traces`,
});
console.log('[OTel] instrumentation-client: exporter url =', `${window.location.origin}/api/otlp/v1/traces`);

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs',
  }),
  spanProcessors: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new BatchSpanProcessor(exporter as any, { scheduledDelayMillis: 1000 }),
  ],
});

provider.register();
console.log('[OTel] instrumentation-client: provider registered');

registerInstrumentations({
  instrumentations: [new DocumentLoadInstrumentation()],
});

// 파이프라인 동작 확인용 테스트 스팬 — 즉시 flush
const tracer = provider.getTracer('init-test');
const span = tracer.startSpan('browser-init-test');
span.end();

provider.forceFlush()
  .then(() => console.log('[OTel] instrumentation-client: flush OK'))
  .catch((err) => console.error('[OTel] instrumentation-client: flush FAILED', err));