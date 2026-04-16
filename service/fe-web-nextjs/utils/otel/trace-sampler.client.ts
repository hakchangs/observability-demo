import {type Attributes, context, type Context, createContextKey, type SpanKind} from "@opentelemetry/api";
import {Sampler, SamplingDecision, SamplingResult} from "@opentelemetry/sdk-trace-web";

const IGNORE_URL_PATTERNS = [
    /\/_next\//,    // Next.js 정적 에셋 (JS/CSS 번들 등, 추적 제외)
];

// Next.js prefetch 요청 감지용 OTel context key
export const IS_PREFETCH = createContextKey('next-router-prefetch');

export class TraceSampler implements Sampler {
    shouldSample(
        ctx: Context,
        _traceId: string,
        _spanName: string,
        _spanKind: SpanKind,
        attributes: Attributes,
    ): SamplingResult {
        // prefetch 요청 추적 제외 - traceparent 헤더 주입도 막아 백엔드 고아 span 방지
        if (ctx.getValue(IS_PREFETCH)) {
            return { decision: SamplingDecision.NOT_RECORD };
        }
        // URL 패턴으로 추적 제외
        const url = (attributes['http.url'] ?? attributes['url.full'] ?? '') as string;
        if (url && IGNORE_URL_PATTERNS.some(p => p.test(url))) {
            return { decision: SamplingDecision.NOT_RECORD };
        }
        //나머지는 모두 추적
        return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    toString() { return 'TraceSampler'; }
}