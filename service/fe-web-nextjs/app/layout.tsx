import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import AppLayout from '../components/AppLayout';
import RouteTracker from '../components/RouteTracker';

export const metadata: Metadata = {
  title: 'InsureDemo',
  description: '보험 서비스 데모',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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