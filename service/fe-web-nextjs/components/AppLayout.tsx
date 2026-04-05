'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { auth, handleLogout } = useAuth();
  const pathname = usePathname();

  if (!auth) return <>{children}</>;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span>🛡️</span>
          <span className="brand-name">InsureDemo</span>
        </div>
        <nav className="header-nav">
          <Link
            href="/products"
            className={`nav-btn ${pathname === '/products' ? 'active' : ''}`}
          >
            상품 목록
          </Link>
          <Link
            href="/subscriptions"
            className={`nav-btn ${pathname === '/subscriptions' ? 'active' : ''}`}
          >
            내 보험
          </Link>
          <Link
            href="/ssr-products"
            className={`nav-btn ${pathname === '/ssr-products' ? 'active' : ''}`}
          >
            상품목록(SSR)
          </Link>
        </nav>
        <div className="header-user">
          <span className="username">{auth.username}</span>
          <button className="btn-logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}