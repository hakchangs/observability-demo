import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { getCurrentGuid } from './guid.ts';

// 런타임 주입값 우선, 미치환(${...}) 이면 Vite 빌드값으로 폴백 (로컬 dev 지원)
function runtimeEnv(key: string, fallback: string): string {
  const val = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key];
  if (val && !val.startsWith('${')) return val;
  return (import.meta.env[key] as string | undefined) ?? fallback;
}

const OTLP_URL = runtimeEnv('VITE_OTLP_TRACES_PATH', '/v1/traces');
const SERVICE_NAME = runtimeEnv('VITE_SERVICE_NAME', 'fe-web');
const SERVICE_VERSION = runtimeEnv('VITE_SERVICE_VERSION', '0.0.1');
const DEPLOYMENT_ENVIRONMENT = runtimeEnv('VITE_DEPLOYMENT_ENV', 'demo');

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': SERVICE_NAME,
    'service.version': SERVICE_VERSION,
    'deployment.environment': DEPLOYMENT_ENVIRONMENT,
  }),
  spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: OTLP_URL }), {
          scheduledDelayMillis: 1000
      })
  ],
});

provider.register({
  propagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  }),
});

// initWebVitals();

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({
      clearTimingResources: true,
      applyCustomAttributesOnSpan: (span) => {
        const guid = getCurrentGuid();
        if (guid) span.setAttribute('guid', guid);
      },
    }),
  ],
});