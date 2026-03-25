import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';
import { context, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { getPageAttributes } from '../navigation-context';
import { getSessionAttributes } from './session';
import { getCurrentGuid } from './guid';

const tracer = trace.getTracer('web-vitals');

function report(metric: Metric): void {
  console.debug('[web-vitals]', metric.name, metric.value, metric.rating);
  context.with(ROOT_CONTEXT, () => {
    const span = tracer.startSpan(`web_vital.${metric.name.toLowerCase()}`);
    span.setAttributes({
      'web_vital.name': metric.name,
      'web_vital.value': metric.value,
      'web_vital.rating': metric.rating,
      'web_vital.id': metric.id,
      ...getPageAttributes(),
      ...getSessionAttributes(),
    });
    const guid = getCurrentGuid();
    if (guid) span.setAttribute('guid', guid);
    span.end();
  });
}

export function initWebVitals(): void {
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}