import { useEffect, useState } from 'react';
import { getProducts } from '../api/products';
import type { Product } from '../api/products';

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">상품 목록을 불러오는 중...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>보험 상품 목록</h2>
        <p>다양한 보험 상품을 확인하세요</p>
      </div>
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
    </div>
  );
}
