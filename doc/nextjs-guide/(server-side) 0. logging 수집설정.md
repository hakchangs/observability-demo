# logging 수집설정

작업내용
- loglevel 로 작성한 서버 로그를 수집하도록 설정

> 지원 Stack: NextJS(typescript) + loglevel
> 참고: pino, winston 은 otel instrumentation 제공하나 log level 은 지원하지 않음.

### 샘플 코드

##### 1. 라이브러리 추가
```bash
npm install @opentelemetry/api-logs@^0.200.0
```

##### 2. logger 추가
```ts
// {project-root}/utils/logger.server.ts
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

// K8s operator 가 주입한 LoggerProvider 에 loglevel 로그를 브리징
export function setupLogBridge() {
  if (patched) return;
  patched = true;

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
        // OTel not initialized yet — ignore
      }
    };
  };
  log.setLevel(log.getLevel());
}
```

##### 3. instrumentation 추가 및 logger 설정
```ts
// {project-root}/instrumentation.ts
export async function register() {
    //server side 경우만 logger 설정
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { setupLogBridge } = await import('./utils/logger.server');
        setupLogBridge();
    }
}
```

##### 4. instrumentation 충돌방지 설정
K8s Pod 에서 자동설정되는 auto-instrumentation 인스턴스와 loglevel 공유하여 사용하도록 설정
```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    // 공유할 라이브러리를 제외하고 서버 번들 생성
    serverExternalPackages: ['@opentelemetry/api-logs', 'loglevel', '@opentelemetry/api'],
};

export default nextConfig;
```

##### 5. 테스트 코드 작성
```tsx
// {project-root}/app/ssr-products/page.tsx
// Server Component (no 'use client') - SSR 추적 테스트용
import log from 'loglevel';

export default async function SsrProductsPage() {

    const logger = log.getLogger('ssr-products');
    logger.setLevel("info");
    logger.info('Render SsrProducts...');

    return (
        <div className="page">
            <div className="page-header">
                <h2>보험 상품 목록 (SSR)</h2>
                <p>Server Component에서 직접 fetch — SSR 추적 테스트</p>
            </div>
        </div>
    );
}
```

##### 6. 확인
1. Browser > /ssr-products 페이지 접속
2. (Grafana) Logs > 로그 기록여부 확인 > 정상
