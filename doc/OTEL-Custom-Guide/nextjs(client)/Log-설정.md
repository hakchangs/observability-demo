### Trace 설정

작업내용
- Browser 에서 발생하는 Trace/Log/Metric 정보를 수집하도록 설정
- NextJS 서버사이드 동작과 충돌방지 처리

> 적용 Stack: NextJS + loglevel

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

