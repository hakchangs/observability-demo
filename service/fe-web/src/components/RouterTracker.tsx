import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('fe-web');

export default function RouterTracker() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const to = location.pathname;

    if (prevPath.current === null) {
      prevPath.current = to;
      return;
    }

    const span = tracer.startSpan(`navigate ${to}`, {
      attributes: {
        'route.from': prevPath.current,
        'route.to': to,
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    prevPath.current = to;
  }, [location.pathname]);

  return null;
}
