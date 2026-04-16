# OTEL 수집설정

작업내용
- Browser 에서 발생하는 Trace/Log/Metric 정보를 수집하도록 설정
- NextJS 서버사이드 동작과 충돌방지 처리

> 적용 Stack: NextJS + loglevel

### Trace 설정
- Browser 에서 Document Load, fetch() 호출시 추적하도록 설정
- 정적 리소스 요청, Next-Prefetch-Prefetch 추적 제외 처리

##### 1. 라이브러리 추가
```bash
npm install @opentelemetry/resources@^2.0.0
npm install @opentelemetry/api@^1.9.0
npm install @opentelemetry/exporter-trace-otlp-http@^0.200.0
npm install @opentelemetry/sdk-trace-web@^2.0.0
npm install @opentelemetry/instrumentation@^0.200.0
npm install @opentelemetry/instrumentation-document-load@^0.52.0
npm install @opentelemetry/instrumentation-fetch@^0.200.0
```

##### 2. Trace Sampler 생성 (NextJS Prefetch 및 불필요 추적대상 필터링)
```ts
// @/utils/otel/trace-sampler.client.ts
import {type Attributes, context, type Context, createContextKey, type SpanKind} from "@opentelemetry/api";
import {Sampler, SamplingDecision, SamplingResult} from "@opentelemetry/sdk-trace-web";

const IGNORE_URL_PATTERNS = [
    /\/_next\//,    // Next.js 정적 에셋 (JS/CSS 번들 등, 추적 제외)
];

// Next.js prefetch 요청 감지용 OTel context key
export const IS_PREFETCH = createContextKey('next-router-prefetch');

export class TraceSampler implements Sampler {
    shouldSample(
        ctx: Context,
        _traceId: string,
        _spanName: string,
        _spanKind: SpanKind,
        attributes: Attributes,
    ): SamplingResult {
        // prefetch 요청 추적 제외 - traceparent 헤더 주입도 막아 백엔드 고아 span 방지
        if (ctx.getValue(IS_PREFETCH)) {
            return { decision: SamplingDecision.NOT_RECORD };
        }
        // URL 패턴으로 추적 제외
        const url = (attributes['http.url'] ?? attributes['url.full'] ?? '') as string;
        if (url && IGNORE_URL_PATTERNS.some(p => p.test(url))) {
            return { decision: SamplingDecision.NOT_RECORD };
        }
        //나머지는 모두 추적
        return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    toString() { return 'TraceSampler'; }
}
```

##### 3. Trace Provider 설정
```ts
// @/utils/otel/trace-loader.client.ts
import {resourceFromAttributes} from "@opentelemetry/resources";
import {BatchSpanProcessor, WebTracerProvider} from "@opentelemetry/sdk-trace-web";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-http";
import {registerInstrumentations} from "@opentelemetry/instrumentation";
import {DocumentLoadInstrumentation} from "@opentelemetry/instrumentation-document-load";
import {FetchInstrumentation} from "@opentelemetry/instrumentation-fetch";
import {context} from "@opentelemetry/api";
import {IS_PREFETCH, TraceSampler} from "@/utils/otel/trace-sampler.client";

const resource = resourceFromAttributes({
    'service.name': `${process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs'}-client`,
});

const provider = new WebTracerProvider({
    sampler: new TraceSampler(),
    resource,
    spanProcessors: [
        new BatchSpanProcessor(
            new OTLPTraceExporter({ url: `${window.location.origin}/api/otlp/v1/traces` }),
            { scheduledDelayMillis: 1000 },
        ),
    ],
});

provider.register();

registerInstrumentations({
    instrumentations: [
        new DocumentLoadInstrumentation(),
        new FetchInstrumentation(),
    ],
});

// NextJS Prefetch 식별 동작 래핑
// - FetchInstrumentation 등록 후 래핑해야 Sampler 호출 시점에 context 가 살아있음
// - Next-Router-Prefetch: 1 헤더가 있으면 IS_PREFETCH 플래그를 context 에 입력
// - TraceSampler 가 해당 span 을 NOT_RECORD 처리 → traceparent 헤더도 주입 안함
const instrumentedFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (headers.get('Next-Router-Prefetch') === '1') {
        return context.with(
            context.active().setValue(IS_PREFETCH, true),
            () => instrumentedFetch(input, init),
        );
    }
    return instrumentedFetch(input, init);
};
```
```ts
// @/instrumentation-client.ts
// Trace 수집 설정
import '@/utils/otel/trace-loader.client'
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
2. (Grafana) Traces > 추적 기록여부 확인 > 정상

### Log 설정
##### 1. 라이브러리 추가
```bash
npm install @opentelemetry/resources@^2.0.0
npm install @opentelemetry/exporter-logs-otlp-http@^0.200.0
```

##### 2. Logger 생성 (loglevel 브리징)
```ts
// @/utils/otel/logger.client.ts
import log, { type LogLevelNames } from 'loglevel';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

const SEVERITY: Record<LogLevelNames, SeverityNumber> = {
    trace: SeverityNumber.TRACE,
    debug: SeverityNumber.DEBUG,
    info:  SeverityNumber.INFO,
    warn:  SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
};

let patched = false;

// 브라우저 LoggerProvider 에 loglevel 로그를 브리징
export function setupLogBridge() {
    if (patched) return;
    patched = true;

    // 브라우저 기본 레벨: info (loglevel 기본값은 WARN)
    log.setDefaultLevel('info');

    const originalFactory = log.methodFactory;
    log.methodFactory = (methodName, logLevel, loggerName) => {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        return (...args: unknown[]) => {
            rawMethod(...args);
            try {
                const otelLogger = logs.getLogger(String(loggerName ?? 'default'));
                otelLogger.emit({
                    severityNumber: SEVERITY[methodName] ?? SeverityNumber.UNSPECIFIED,
                    severityText: methodName.toUpperCase(),
                    body: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
                });
            } catch {
                // OTel LoggerProvider 미등록 시 무시
            }
        };
    };
    log.setLevel(log.getLevel());
}
```

##### 3. Log Provider 설정
```ts
// @/utils/otel/log-loader.client.ts
import {BatchLogRecordProcessor, LoggerProvider} from "@opentelemetry/sdk-logs";
import {resourceFromAttributes} from "@opentelemetry/resources";
import {OTLPLogExporter} from "@opentelemetry/exporter-logs-otlp-http";
import {logs} from "@opentelemetry/api-logs";
import {setupLogBridge} from "@/utils/otel/logger.client";

const resource = resourceFromAttributes({
    'service.name': `${process.env.NEXT_PUBLIC_SERVICE_NAME ?? 'fe-web-nextjs'}-client`,
});

// 브라우저 LoggerProvider 등록 → setupLogBridge 가 이 provider 를 통해 Loki 로 전송
const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${window.location.origin}/api/otlp/v1/logs` }),
    ),
);
logs.setGlobalLoggerProvider(loggerProvider);

setupLogBridge();
```
```ts
// @/instrumentation-client.ts
// Log 수집 설정
import '@/utils/otel/log-loader.client'
```

##### 4. 테스트 코드 작성
```tsx
// @/app/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import log from "loglevel";

export default function ProductsPage() {

    const logger = log.getLogger('products-page');
    logger.setLevel("info");
    logger.info("Rendering Product Page...");

    return (
        <div className="page">
            <div className="page-header">
                <h2>보험 상품 목록</h2>
                <p>다양한 보험 상품을 확인하세요</p>
            </div>
        </div>
    );
}
```

##### 5. 확인
1. Browser > /products 페이지 접속
2. (Grafana) Logs > 로그 기록여부 확인 > 정상

