### GUID 전파

작업내용
- Document Load 로 인한 SSR 페이지 호출시 GUID 전파, Span 저장처리 (페이지 신규 접근, 리로딩)
- `render route (app)` Span 에 GUID 저장 (Grafana 검색 가능)

> 적용 Stack: NextJS

##### 1. 라이브러리 추가
```bash
npm install @opentelemetry/api@^1.9.0
```

##### 2. baggage 헤더 강제 주입 (서버사이드 fetch 오버라이딩)
```ts
// @/utils/otel/instrumentation.ts

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {

        // override fetch() > baggage header 추가
        const originalFetch = globalThis.fetch;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = async function patchedFetch(
            input: RequestInfo | URL,
            init?: RequestInit,
        ) {
            try {
                const { headers } = await import('next/headers');
                const reqHeaders = await headers();
                const baggage = reqHeaders.get('baggage');
                if (baggage) {
                    const outHeaders = new Headers(init?.headers);
                    if (!outHeaders.has('baggage')) {
                        outHeaders.set('baggage', baggage);
                    }
                    return originalFetch(input, { ...init, headers: outHeaders });
                }
            } catch {
                // request context 외부(헬스체크, 초기화 등)에서는 그냥 통과
            }
            return originalFetch(input, init);
        };
    }
}
```

##### 3. guid 생성 및 baggage 입력
```ts
// @/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateGuid } from '@/utils/otel/guid';

export function middleware(request: NextRequest) {

    const existing = request.headers.get('baggage') ?? '';

    // 이미 guid 있으면 그대로 통과 (클라이언트가 설정한 경우)
    if (existing.includes('guid=')) {
        return NextResponse.next();
    }

    const guid = generateGuid();
    const baggage = existing ? `${existing},guid=${guid}` : `guid=${guid}`;

    // 요청 헤더에 baggage 주입 → OTel HTTP 계측이 context에 자동 추출
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('baggage', baggage);

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: [
        // 정적 에셋, OTLP 엔드포인트 제외
        '/((?!_next/static|_next/image|favicon.ico|api/otlp).*)',
    ],
};
```

##### 4. span attribute 에 guid 저장
```tsx
// @/app/layout.tsx

import { headers } from 'next/headers';
import { trace } from '@opentelemetry/api';

export default async function RootLayout({ children }: { children: React.ReactNode }) {

    // 모든 SSR 요청 공통: middleware가 주입한 baggage에서 guid 읽어 span에 저장
    const headersList = await headers();
    const baggage = headersList.get('baggage') ?? '';
    const guid = baggage.split(',').find(e => e.trim().startsWith('guid='))?.split('=')[1]?.trim();
    if (guid) {
        trace.getActiveSpan()?.setAttribute('guid', guid);
    }

    return (
        <html lang="ko">
        <body>
            {children}
        </body>
        </html>
    );
}
```

##### 5. 테스트 코드 작성
```tsx
// Server Component (no 'use client') - SSR 추적 테스트용
import {cookies, headers} from 'next/headers';
import type { Product } from '../../api/products';
import log from 'loglevel';

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

  const logger = log.getLogger('ssr-products');
  logger.setLevel("info");
  logger.info('Render SsrProducts...');

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
```

##### 6. 확인
1. Browser > 신규 탭 > /ssr-products 페이지 접속 (페이지 신규접근) 
2. (Grafana) Traces > 추적 기록 검색 > span attribute guid 적재여부 확인 > 정상
3. (Grafana) Traces > span attribute guid 로 검색 > 정상
