import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { env } from "./otel-const.ts";
import {GuidBaggageInstrumentation} from "./guid-baggage-instrumentation.ts";
import {BaggageToAttributesProcessor} from "./baggage-span-processor.ts";

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    'service.name': env["otel.service.name"],
    'service.version': env["otel.service.version"],
    'deployment.environment': env["deployment.environment.name"],
  }),
  spanProcessors: [
    new BaggageToAttributesProcessor(),
    new BatchSpanProcessor(new OTLPTraceExporter({
        url: env["otel.traces.path"],
    }), {
        scheduledDelayMillis: 1000,
    })
  ],
});

provider.register({
  propagator: new CompositePropagator({
    propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator()
    ],
  }),
});

registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation(),
    new GuidBaggageInstrumentation(),
  ],
});