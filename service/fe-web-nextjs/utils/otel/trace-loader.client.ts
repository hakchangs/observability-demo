import {CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator} from "@opentelemetry/core";
import {resourceFromAttributes} from "@opentelemetry/resources";
import {BatchSpanProcessor, WebTracerProvider} from "@opentelemetry/sdk-trace-web";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-http";
import {registerInstrumentations} from "@opentelemetry/instrumentation";
import {DocumentLoadInstrumentation} from "@opentelemetry/instrumentation-document-load";
import {FetchInstrumentation} from "@opentelemetry/instrumentation-fetch";
import {context, propagation} from "@opentelemetry/api";
import {IS_PREFETCH, TraceSampler} from "@/utils/otel/trace-sampler.client";
import {generateGuid} from "@/utils/otel/guid";
import {BaggageToAttributesProcessor} from "@/utils/otel/baggage-span-processor";
import {XMLHttpRequestInstrumentation} from "@opentelemetry/instrumentation-xml-http-request";

const resource = resourceFromAttributes({
    'service.name': `${process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs'}-client`,
});

const provider = new WebTracerProvider({
    sampler: new TraceSampler(),
    resource,
    spanProcessors: [
        // baggage 를 span attribute 로 저장
        new BaggageToAttributesProcessor(),
        new BatchSpanProcessor(
            // new OTLPTraceExporter({ url: `${window.location.origin}/api/otlp/v1/traces` }),
            new OTLPTraceExporter({ url: `http://otelcol.platform.local/v1/traces` }),
            { scheduledDelayMillis: 1000 },
        ),
    ],
});

provider.register({
    propagator: new CompositePropagator({
        propagators: [
            new W3CTraceContextPropagator(),
            new W3CBaggagePropagator(),
        ],
    }),
});

registerInstrumentations({
    instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({
            // propagateTraceHeaderCorsUrls: [/.*/],
        }),
        new XMLHttpRequestInstrumentation({
            // propagateTraceHeaderCorsUrls: [/.*/],
        })
    ],
});

// NextJS Prefetch 식별 동작 래핑
// - FetchInstrumentation 등록 후 래핑해야 Sampler 호출 시점에 context 가 살아있음
// - Next-Router-Prefetch: 1 헤더가 있으면 IS_PREFETCH 플래그를 context 에 입력
// - TraceSampler 가 해당 span 을 NOT_RECORD 처리 → traceparent 헤더도 주입 안함
const instrumentedFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (headers.get('Next-Router-Prefetch') === '1') {
        return context.with(
            context.active().setValue(IS_PREFETCH, true),
            () => instrumentedFetch(input, init),
        );
    }

    // GUID 전파 설정
    const guid = generateGuid();
    const baggage = propagation.createBaggage({ guid: { value: guid } });
    const ctx = propagation.setBaggage(context.active(), baggage);

    return context.with(ctx, () => {
        return instrumentedFetch(input, {...init, headers})
    });
};