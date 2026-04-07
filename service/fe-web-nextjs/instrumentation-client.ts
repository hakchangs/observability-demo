import { setupLogBridge } from './utils/logger.client';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { SamplingDecision, type Sampler, type SamplingResult } from '@opentelemetry/sdk-trace-web';
import { context, createContextKey, type Attributes, type SpanKind, type Context } from '@opentelemetry/api';

const IGNORE_URL_PATTERNS = [
  /\/_next\//,    // Next.js 정적 에셋 (JS/CSS 번들 등, 추적 불필요)
  // /[?&]_rsc=/  // 실제 네비게이션 RSC 는 수집 필요 → prefetch 만 별도 제거
];

// Next.js prefetch 요청 감지용 OTel context key
// FetchInstrumentation 등록 후 fetch 래핑으로 주입, Sampler 에서 읽음
const IS_PREFETCH = createContextKey('next-router-prefetch');

class FilteringSampler implements Sampler {
  shouldSample(
    ctx: Context,
    _traceId: string,
    _spanName: string,
    _spanKind: SpanKind,
    attributes: Attributes,
  ): SamplingResult {
    // prefetch 요청: traceparent 헤더 주입도 막아 백엔드 고아 span 방지
    if (ctx.getValue(IS_PREFETCH)) {
      return { decision: SamplingDecision.NOT_RECORD };
    }
    // Next.js 정적 에셋
    const url = (attributes['http.url'] ?? attributes['url.full'] ?? '') as string;
    if (url && IGNORE_URL_PATTERNS.some(p => p.test(url))) {
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

// 브라우저 LoggerProvider 등록 → setupLogBridge 가 이 provider 를 통해 Loki 로 전송
const loggerProvider = new LoggerProvider({
  resource: provider.resource,
});
loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: `${window.location.origin}/api/otlp/v1/logs` }),
  ),
);
loggerProvider.register();

setupLogBridge();

// FetchInstrumentation 등록 후 래핑해야 Sampler 호출 시점에 context 가 살아있음
// Next-Router-Prefetch: 1 헤더가 있으면 IS_PREFETCH 플래그를 context 에 심어
// FilteringSampler 가 해당 span 을 NOT_RECORD 처리 → traceparent 헤더도 주입 안함
const instrumentedFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (headers.get('Next-Router-Prefetch') === '1') {
    return context.with(
      context.active().setValue(IS_PREFETCH, true),
      () => instrumentedFetch(input, init),
    );
  }
  return instrumentedFetch(input, init);
};