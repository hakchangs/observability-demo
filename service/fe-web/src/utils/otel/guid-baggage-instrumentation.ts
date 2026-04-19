import {InstrumentationBase} from "@opentelemetry/instrumentation";
import {generateGuid} from "./guid.ts";
import {context, propagation} from "@opentelemetry/api";

export class GuidBaggageInstrumentation extends InstrumentationBase {
  constructor() {
    super('guid-baggage', '1.0.0', {});
  }

  init() {
    return [];
  }

  override enable() {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const guid = generateGuid();
      const baggage = propagation.createBaggage({guid: {value: guid}});
      const ctx = propagation.setBaggage(context.active(), baggage);
      return context.with(ctx, () => original(input, init));
    }
  }
}