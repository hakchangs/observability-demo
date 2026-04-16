import {ReadableSpan, Span, SpanProcessor} from "@opentelemetry/sdk-trace-base";
import {Context, propagation} from "@opentelemetry/api";

// baggage 에 담긴 모든 값을 span 에 저장
export class BaggageToAttributesProcessor implements SpanProcessor {
    onStart(span: Span, parentContext: Context): void {
        const baggage = propagation.getBaggage(parentContext);
        baggage?.getAllEntries().forEach(([key, entry]) => {
            span.setAttribute(`${key}`, entry.value);
        });
    }
    onEnd(_span: ReadableSpan): void {}
    forceFlush(): Promise<void> { return Promise.resolve(); }
    shutdown(): Promise<void> { return Promise.resolve(); }
}