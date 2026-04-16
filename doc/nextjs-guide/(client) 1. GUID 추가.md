# GUID 추가

작업내용
- GUID 생성/수신하고 전파 처리
- Traces 에 GUID 저장

##### 1. 라이브러리 추가
Trace 설정 라이브러리 유지(추가없음)

##### 2. GUID 생성기 추가
```ts
// @/utils/otel/guid.ts
const SYSTEM_CODE = 'LTP';

export function generateGuid(): string {
    const now = new Date();
    const pad = (n: number, len: number) => String(n).padStart(len, '0');
    const timestamp =
        now.getFullYear().toString() +
        pad(now.getMonth() + 1, 2) +
        pad(now.getDate(), 2) +
        pad(now.getHours(), 2) +
        pad(now.getMinutes(), 2) +
        pad(now.getSeconds(), 2) +
        pad(now.getMilliseconds(), 3); // 17자
    const random = pad(Math.floor(Math.random() * 10_000_000_000), 10); // 10자
    return `${timestamp}${SYSTEM_CODE}${random}`;
}

let _currentGuid = '';

export function setCurrentGuid(guid: string): void {
    _currentGuid = guid;
}

export function getCurrentGuid(): string {
    return _currentGuid;
}
```

##### 3. 추적 정보에 추가
Trace 설정시 생성한 trace-loader.client.ts 에 guid 생성설정 추가

```ts
// @/utils/otel/trace-loader.client.ts
// - 기존 생성한 코드에 GUID 연관 코드 일부 추가

// GUID 생성기 임포트
import {generateGuid} from "@/utils/otel/guid";

// Fetch Span 에 guid 설정
registerInstrumentations({
    instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation({
            //GUID 생성 및 설정
            clearTimingResources: true,
            applyCustomAttributesOnSpan: (span) => {
                span.setAttribute("guid", generateGuid())
            }
        }),
    ],
});

const instrumentedFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (headers.get('Next-Router-Prefetch') === '1') {
        return context.with(
            context.active().setValue(IS_PREFETCH, true),
            () => instrumentedFetch(input, init),
        );
    }

    const guid = generateGuid();
    setCurrentGuid(guid);

    // GUID 전파 설정
    // - baggage header 설정 및 전파 유도
    headers.set("baggage", `guid=${guid}`);

    // 기존 헤더는 유지
    return instrumentedFetch(input, {
        ...init, headers
    });
};
```

##### 4. 테스트 코드 작성
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts } from '../../api/products';
import type { Product } from '../../api/products';
import log from "loglevel";

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
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // fetch() 요청 및 추적 테스트
    getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);
    
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
```

##### 5. 확인
1. Browser > /products 페이지 접속
2. (Grafana) Traces > 추적 검색 > Span Attributes > guid 속성 존재여부 확인 > 정상
