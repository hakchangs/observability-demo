### Log 설정

작업내용
- otel-sdk 라이브러리 추가 및 trace, log 연동 설정

> 적용 Stack: React 19.x + loglevel

##### 1. 라이브러리 추가
```bash
npm install @opentelemetry/api@^1.9.0
npm install @opentelemetry/exporter-logs-otlp-http@^0.200.0
npm install @opentelemetry/resources@^2.0.0
npm install @opentelemetry/sdk-trace-web@^2.0.0
```

##### 2. log 수집 설정 추가
```ts
// @/utils/otel/log/log-loader

import log from "loglevel";
import type { LogLevelNames } from "loglevel";
import { SeverityNumber } from "@opentelemetry/api-logs";
import {BatchLogRecordProcessor, LoggerProvider} from "@opentelemetry/sdk-logs";
import {resourceFromAttributes} from "@opentelemetry/resources";
import {OTLPLogExporter} from "@opentelemetry/exporter-logs-otlp-http";
import {env} from "./otel-const";

const SEVERITY_MAP: Partial<Record<LogLevelNames, SeverityNumber>> = {
    trace: SeverityNumber.TRACE,
    debug: SeverityNumber.DEBUG,
    info:  SeverityNumber.INFO,
    warn:  SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
};

const provider = new LoggerProvider({
    resource: resourceFromAttributes({
        'service.name': env["otel.service.name"],
        'service.version': env["otel.service.version"],
        'deployment.environment': env["deployment.environment.name"],
    }),
});

provider.addLogRecordProcessor(
    new BatchLogRecordProcessor(new OTLPLogExporter({
        url: env["otel.logs.path"]
    }), {
        scheduledDelayMillis: 1000
    })
);

const originalFactory = log.methodFactory;

log.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);
    const logger = provider.getLogger(typeof loggerName === "symbol" ? loggerName.toString() : loggerName);

    return function (...args: unknown[]): void {
        rawMethod(...args);

        try {
            logger.emit({
                severityNumber: SEVERITY_MAP[methodName] ?? SeverityNumber.INFO,
                severityText: methodName.toUpperCase(),
                body: args.map(a =>
                    typeof a === "object" ? JSON.stringify(a) : String(a)
                ).join(" "),
                attributes: {
                    "log.source": "loglevel",
                    "log.level": methodName,
                },
            });
        } catch (err) {
            // OTel 실패해도 loglevel 동작은 유지
            console.error("OTel loglevel logging failed", err);
        }
    };
};

log.setLevel("info");
```

##### 3. log 설정 로딩: main.tsx
```ts
// @/utils/otel/instrumentation.ts

// logs 설정
import './log-loader'
```
```tsx
// @/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// otel instrumentation 설정
import './utils/otel/instrumentation'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
```

##### 4. 테스트 코드 작성
```tsx
import { useEffect, useState } from 'react';
import log from "loglevel";

export default function ProductsPage() {

  const logger = log.getLogger("ProductsPage");
  logger.info("Rendering ProductsPage...");

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
2. (Grafana) Logs > 관련 로그 탐색 > 정상

