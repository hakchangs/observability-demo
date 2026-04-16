// Server Component (no 'use client') - SSR 추적 테스트용
import { cookies } from 'next/headers';
import type { Product } from '../../api/products';
import log from 'loglevel';
import logger from "@/utils/logger";

const TYPE_LABEL: Record<string, string> = {
  LIFE: '생명보험',
  HEALTH: '건강보험',
  CAR: '자동차보험',
  HOME: '주택보험',
};

const TYPE_COLOR: Record<string, string> = {
  LIFE: '#3b82f6',
  HEALTH: '#10b981',
  CAR: '#f59e0b',
  HOME: '#8b5cf6',
};

async function fetchProducts(): Promise<Product[]> {
  const logger = log.getLogger('ssr-products');
  logger.setLevel("info");
  logger.info('fetchProducts...');

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const bffUrl = process.env.BFF_URL ?? 'http://localhost:8880';
  const res = await fetch(`${bffUrl}/api/products`, {
    cache: 'no-store',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`products fetch failed: ${res.status}`);
  return res.json();
}

export default async function SsrProductsPage() {
  let products: Product[] = [];
  let error = '';

    logger.setLevel("info");
  logger.info('fetchProducts...');

  try {
    products = await fetchProducts();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>보험 상품 목록 (SSR)</h2>
        <p>Server Component에서 직접 fetch — SSR 추적 테스트</p>
      </div>
      {error ? (
        <div className="error-msg">{error}</div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div
                className="product-type-badge"
                style={{ backgroundColor: TYPE_COLOR[product.type] ?? '#6b7280' }}
              >
                {TYPE_LABEL[product.type] ?? product.type}
              </div>
              <h3>{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-info">
                <div className="product-info-item">
                  <span className="label">월 보험료</span>
                  <span className="value">{product.monthlyPremium.toLocaleString()}원</span>
                </div>
                <div className="product-info-item">
                  <span className="label">보장 내용</span>
                  <span className="value coverage">{product.coverage}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}