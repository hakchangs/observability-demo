import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

const exporter = new OTLPTraceExporter({
  url: `${window.location.origin}/api/otlp/v1/traces`,
});

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
    new FetchInstrumentation({
      ignoreUrls: [
        /\/api\/otlp\//,  // OTLP export 순환 방지
        /\/_next\//,      // Next.js 정적 청크, 하이드레이션 내부 요청
        /[?&]_rsc=/,      // RSC 청크 요청 (서버사이드에서 이미 수집)
      ],
    }),
  ],
});