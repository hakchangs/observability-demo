import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { setPage, getPageAttributes } from '../navigation-context';

const tracer = trace.getTracer('fe-web');

export default function RouterTracker() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const to = location.pathname;
    setPage(to);

    if (prevPath.current === null) {
      prevPath.current = to;
      return;
    }

    const span = tracer.startSpan(`navigate ${to}`, {
      attributes: {
        'route.from': prevPath.current,
        'route.to': to,
        ...getPageAttributes(),
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    prevPath.current = to;
  }, [location.pathname]);

  return null;
}
