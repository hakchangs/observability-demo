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
