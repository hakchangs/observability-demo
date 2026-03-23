import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
// import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
// import { ZoneContextManager } from "@opentelemetry/context-zone"
import { getPageAttributes } from './navigation-context';
import { getCurrentGuid } from './utils/guid';

// 런타임 주입값 우선, 미치환(${...}) 이면 Vite 빌드값으로 폴백 (로컬 dev 지원)
function runtimeEnv(key: string, fallback: string): string {
  const val = (window as any).__ENV__?.[key];
  if (val && !val.startsWith('${')) return val;
  return (import.meta.env[key] as string | undefined) ?? fallback;
}

const OTLP_URL = runtimeEnv('VITE_OTLP_TRACES_PATH', '/v1/traces');

const exporter = new OTLPTraceExporter({ url: OTLP_URL });

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': runtimeEnv('VITE_SERVICE_NAME', 'fe-web'),
    'service.version': runtimeEnv('VITE_SERVICE_VERSION', '0.0.1'),
    'deployment.environment': runtimeEnv('VITE_DEPLOYMENT_ENV', 'demo'),
  }),
  spanProcessors: [new BatchSpanProcessor(exporter)]
});

provider.register({
  propagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  }),
  // contextManager: new ZoneContextManager()
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    // new UserInteractionInstrumentation({ eventNames: ['click'] }),
    new FetchInstrumentation({
      clearTimingResources: true,
      applyCustomAttributesOnSpan: (span) => {
        span.setAttributes(getPageAttributes());
        const guid = getCurrentGuid();
        if (guid) span.setAttribute('guid', guid);
      },
    }),
  ],
});