'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import log from 'loglevel';

export default function RouteTracker() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const logger = log.getLogger('route-tracker');
    logger.setLevel("info");
    logger.info('route..... to=', pathname);

    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }

    prevPath.current = pathname;
  }, [pathname]);

  return null;
}