import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
// import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { ZoneContextManager } from "@opentelemetry/context-zone"

const OTLP_URL = import.meta.env.VITE_OTLP_TRACES_PATH ?? '/v1/traces';

const exporter = new OTLPTraceExporter({ url: OTLP_URL });

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': import.meta.env.VITE_SERVICE_NAME ?? 'fe-web',
    'service.version': import.meta.env.VITE_SERVICE_VERSION ?? '0.0.1',
    'deployment.environment': import.meta.env.VITE_DEPLOYMENT_ENV ?? 'demo',
  }),
  spanProcessors: [new BatchSpanProcessor(exporter)]
});

provider.register({
  propagator: new W3CTraceContextPropagator(),
  contextManager: new ZoneContextManager()
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    // new UserInteractionInstrumentation({ eventNames: ['click'] }),
    new FetchInstrumentation({ clearTimingResources: true }),
  ],
});