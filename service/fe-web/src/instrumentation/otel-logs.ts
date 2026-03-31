import {
    LoggerProvider,
    BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';
import {
    OTLPLogExporter
} from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';

function runtimeEnv(key: string, fallback: string): string {
    const val = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key];
    if (val && !val.startsWith('${')) return val;
    return (import.meta.env[key] as string | undefined) ?? fallback;
}

const OTLP_URL = runtimeEnv('VITE_OTLP_LOGS_PATH', '/v1/logs');

// 1️⃣ exporter
const exporter = new OTLPLogExporter({
    url: OTLP_URL
});

// 2️⃣ provider
const provider = new LoggerProvider({
    resource: new Resource({
        'service.name': runtimeEnv('VITE_SERVICE_NAME', 'fe-web'),
        'service.version': runtimeEnv('VITE_SERVICE_VERSION', '0.0.1'),
        'deployment.environment': runtimeEnv('VITE_DEPLOYMENT_ENV', 'demo'),
    }),
});

// 3️⃣ processor
provider.addLogRecordProcessor(
    new BatchLogRecordProcessor(exporter)
);

// 4️⃣ logger 생성
const logger = provider.getLogger("react-console");

// 5️⃣ 로그 전송
logger.emit({
    severityText: "INFO",
    body: "test log from react"
});