import {ReadableSpan, Span, SpanProcessor} from "@opentelemetry/sdk-trace-web";
import {Context, propagation} from "@opentelemetry/api";

export class BaggageToAttributesProcessor implements SpanProcessor {
    onStart(span: Span, parentContext: Context): void {
        const baggage = propagation.getBaggage(parentContext);
        baggage?.getAllEntries().forEach(([key, entry]) => {
            span.setAttribute(`baggage.${key}`, entry.value);
        });
    }
    onEnd(_span: ReadableSpan): void {}
    forceFlush(): Promise<void> { return Promise.resolve(); }
    shutdown(): Promise<void> { return Promise.resolve(); }
}