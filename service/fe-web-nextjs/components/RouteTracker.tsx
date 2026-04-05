'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { setPage, getPageAttributes } from '../navigation-context';
import log from 'loglevel';

const tracer = trace.getTracer('fe-web-nextjs');

export default function RouteTracker() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    setPage(pathname);

    const logger = log.getLogger('route-tracker');
    logger.info('route..... to=', pathname);

    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }

    const span = tracer.startSpan(`navigate ${pathname}`, {
      attributes: {
        'route.from': prevPath.current,
        'route.to': pathname,
        ...getPageAttributes(),
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    prevPath.current = pathname;
  }, [pathname]);

  return null;
}