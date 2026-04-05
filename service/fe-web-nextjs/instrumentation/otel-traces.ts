import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { getPageAttributes } from '../navigation-context';
import { getCurrentGuid } from '../utils/guid';
import { getSessionAttributes } from '../utils/session';
import { initWebVitals } from '../utils/web-vitals-reporter';

function runtimeEnv(key: string, fallback: string): string {
  const val = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key];
  if (val && !val.startsWith('${')) return val;
  return (process.env[key] as string | undefined) ?? fallback;
}

const OTLP_URL = runtimeEnv('NEXT_PUBLIC_OTLP_TRACES_PATH', '/v1/traces');

const exporter = new OTLPTraceExporter({ url: OTLP_URL });

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': runtimeEnv('NEXT_PUBLIC_SERVICE_NAME', 'fe-web-nextjs'),
    'service.version': runtimeEnv('NEXT_PUBLIC_SERVICE_VERSION', '0.0.1'),
    'deployment.environment': runtimeEnv('NEXT_PUBLIC_DEPLOYMENT_ENV', 'demo'),
  }),
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

provider.register({
  propagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  }),
});

initWebVitals();

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({
      clearTimingResources: true,
      applyCustomAttributesOnSpan: (span) => {
        span.setAttributes(getPageAttributes());
        span.setAttributes(getSessionAttributes());
        const guid = getCurrentGuid();
        if (guid) span.setAttribute('guid', guid);
      },
    }),
  ],
});