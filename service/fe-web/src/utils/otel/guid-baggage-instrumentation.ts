import {InstrumentationBase} from "@opentelemetry/instrumentation";
import {generateGuid} from "./guid.ts";
import {context, propagation} from "@opentelemetry/api";

export class GuidBaggageInstrumentation extends InstrumentationBase {
  constructor() {
    super('guid-baggage', '1.0.0', {});
  }

  private _originalFetch?: typeof window.fetch;

  init() {
    return [];
  }

  override enable() {
    this._originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const guid = generateGuid();
      const baggage = propagation.createBaggage({guid: {value: guid}});
      const ctx = propagation.setBaggage(context.active(), baggage);
      return context.with(ctx, () => this._originalFetch!(input, init));
    }
  }

  override disable() {
    if (this._originalFetch) window.fetch = this._originalFetch;
  }
}