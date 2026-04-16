import {resourceFromAttributes} from "@opentelemetry/resources";
import {BatchSpanProcessor, WebTracerProvider} from "@opentelemetry/sdk-trace-web";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-http";
import {registerInstrumentations} from "@opentelemetry/instrumentation";
import {DocumentLoadInstrumentation} from "@opentelemetry/instrumentation-document-load";
import {FetchInstrumentation} from "@opentelemetry/instrumentation-fetch";
import {context} from "@opentelemetry/api";
import {IS_PREFETCH, TraceSampler} from "@/utils/otel/trace-sampler.client";
import {generateGuid, getCurrentGuid, setCurrentGuid} from "@/utils/otel/guid";

const resource = resourceFromAttributes({
    'service.name': `${process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs'}-client`,
});

const provider = new WebTracerProvider({
    sampler: new TraceSampler(),
    resource,
    spanProcessors: [
        new BatchSpanProcessor(
            new OTLPTraceExporter({ url: `${window.location.origin}/api/otlp/v1/traces` }),
            { scheduledDelayMillis: 1000 },
        ),
    ],
});

provider.register();

registerInstrumentations({
    instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({
            //GUID 속성 설정
            clearTimingResources: true,
            applyCustomAttributesOnSpan: (span) => {
                const guid = getCurrentGuid();
                if (guid) span.setAttribute('guid', guid);
            }
        }),
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

    const guid = generateGuid();
    setCurrentGuid(guid);

    // GUID 전파 설정
    // - baggage header 설정 및 전파 유도
    headers.set("baggage", `guid=${guid}`);

    // 기존 헤더는 유지
    return instrumentedFetch(input, {
        ...init, headers
    });
};