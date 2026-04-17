import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import AppLayout from '../components/AppLayout';
import RouteTracker from '../components/RouteTracker';
import { headers } from 'next/headers';
import { trace } from '@opentelemetry/api';
import { getRootSpan } from '@/utils/otel/root-span-store';

export const metadata: Metadata = {
  title: 'InsureDemo',
  description: '보험 서비스 데모',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 모든 SSR 요청 공통: middleware가 주입한 baggage에서 guid 읽어 span에 저장
  const headersList = await headers();
  const baggage = headersList.get('baggage') ?? '';
  const guid = baggage.split(',').find(e => e.trim().startsWith('guid='))?.split('=')[1]?.trim();
  if (guid) {
    // root span(HTTP 최상위): instrumentation.ts의 capture processor가 저장한 것
    const activeSpan = trace.getActiveSpan();
    const traceId = activeSpan?.spanContext().traceId;
    const rootSpan = traceId ? getRootSpan(traceId) : null;
    (rootSpan ?? activeSpan)?.setAttribute('guid', guid);
  }

  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <RouteTracker />
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}