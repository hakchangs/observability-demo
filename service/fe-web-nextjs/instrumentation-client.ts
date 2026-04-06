'use client';

import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';

const exporter = new OTLPTraceExporter({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  url: `${(window as any).location.origin}/api/otlp/v1/traces`,
});

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs',
  }),
  spanProcessors: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new BatchSpanProcessor(exporter as any, {
      scheduledDelayMillis: 1000,
    }),
  ],
});

provider.register();

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({
      // OTLP export 요청 자체를 추적에서 제외 (순환 간섭 방지)
      ignoreUrls: [/\/api\/otlp\//],
    }),
  ],
});