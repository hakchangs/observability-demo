import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-web';
import type { ExportResult } from '@opentelemetry/core';

// ignoreUrls 가 이 버전에서 동작하지 않아 exporter 레벨에서 직접 필터링
const IGNORE_PATTERNS = [
  /[?&]_rsc=/,    // RSC 청크 (서버사이드에서 이미 수집)
  /\/_next\//,    // Next.js 내부 리소스
];

function shouldIgnore(span: ReadableSpan): boolean {
  const url = (span.attributes['http.url'] ?? span.attributes['url.full'] ?? '') as string;
  return IGNORE_PATTERNS.some(p => p.test(url));
}

class FilteringExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: ReadableSpan[], cb: (result: ExportResult) => void) {
    this.inner.export(spans.filter(s => !shouldIgnore(s)), cb);
  }
  shutdown() { return this.inner.shutdown(); }
  forceFlush?() { return this.inner.forceFlush?.() ?? Promise.resolve(); }
}

const exporter = new FilteringExporter(
  new OTLPTraceExporter({ url: `${window.location.origin}/api/otlp/v1/traces` }),
);

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    'service.name': `${process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs'}-client`,
  }),
  spanProcessors: [
    new BatchSpanProcessor(exporter, { scheduledDelayMillis: 1000 }),
  ],
});

provider.register();

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation(),
  ],
});