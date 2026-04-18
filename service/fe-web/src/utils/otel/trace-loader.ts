import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { getCurrentGuid } from './guid.ts';
import {runtimeEnv} from "./runtime-env-loader.ts";

const OTLP_TRACES_PATH = runtimeEnv('OTEL_EXPORTER_OTLP_TRACES_PATH', '/v1/traces');
const SERVICE_NAME = runtimeEnv('OTEL_SERVICE_NAME', 'fe-web');
const SERVICE_VERSION = runtimeEnv('OTEL_SERVICE_VERSION', '0.0.1');
const DEPLOYMENT_ENVIRONMENT = runtimeEnv('OTEL_DEPLOYMENT_ENVIRONMENT_NAME', 'demo');

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': SERVICE_NAME,
    'service.version': SERVICE_VERSION,
    'deployment.environment': DEPLOYMENT_ENVIRONMENT,
  }),
  spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({
          url: OTLP_TRACES_PATH
      }), {
          scheduledDelayMillis: 1000
      })
  ],
});

provider.register({
  propagator: new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  }),
});

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