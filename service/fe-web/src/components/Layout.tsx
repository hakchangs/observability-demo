import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface Props {
  username: string;
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({ username, onLogout, children }: Props) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span>🛡️</span>
          <span className="brand-name">InsureDemo</span>
        </div>
        <nav className="header-nav">
          <NavLink
            to="/products"
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          >
            상품 목록
          </NavLink>
          <NavLink
            to="/subscriptions"
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          >
            내 보험
          </NavLink>
        </nav>
        <div className="header-user">
          <span className="username">{username}</span>
          <button className="btn-logout" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}