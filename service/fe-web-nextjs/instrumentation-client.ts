import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { SamplingDecision, type Sampler, type SamplingResult } from '@opentelemetry/sdk-trace-web';
import { type Attributes, type SpanKind, type Context } from '@opentelemetry/api';

// Sampler 레벨 필터링: span 생성 자체를 막아 traceparent 헤더 주입도 방지
// FilteringExporter 방식은 헤더는 주입하지만 span을 보내지 않아 백엔드에서 고아 span 발생
const IGNORE_PATTERNS = [
  /[?&]_rsc=/,    // RSC 청크 (서버사이드에서 이미 수집)
  /\/_next\//,    // Next.js 내부 리소스
];

class FilteringSampler implements Sampler {
  shouldSample(
    _context: Context,
    _traceId: string,
    _spanName: string,
    _spanKind: SpanKind,
    attributes: Attributes,
  ): SamplingResult {
    const url = (attributes['http.url'] ?? attributes['url.full'] ?? '') as string;
    if (url && IGNORE_PATTERNS.some(p => p.test(url))) {
      return { decision: SamplingDecision.NOT_RECORD };
    }
    return { decision: SamplingDecision.RECORD_AND_SAMPLED };
  }
  toString() { return 'FilteringSampler'; }
}

const provider = new WebTracerProvider({
  sampler: new FilteringSampler(),
  resource: resourceFromAttributes({
    'service.name': `${process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs'}-client`,
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({ url: `${window.location.origin}/api/otlp/v1/traces` }),
      { scheduledDelayMillis: 1000 },
    ),
  ],
});

provider.register();

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation(),
  ],
});