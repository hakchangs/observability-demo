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
    'service.name': process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs',
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
      ignoreUrls: [/\/api\/otlp\//],
    }),
  ],
});