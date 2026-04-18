import {
    LoggerProvider,
    BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';
import {
    OTLPLogExporter
} from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {runtimeEnv} from "./runtime-env-loader.ts";

const OTLP_LOGS_PATH = runtimeEnv('OTEL_EXPORTER_OTLP_LOGS_PATH', '/v1/logs');
const SERVICE_NAME = runtimeEnv('OTEL_SERVICE_NAME', 'fe-web');
const SERVICE_VERSION = runtimeEnv('OTEL_SERVICE_VERSION', '0.0.1');
const DEPLOYMENT_ENVIRONMENT = runtimeEnv('OTEL_DEPLOYMENT_ENVIRONMENT_NAME', 'demo');

// 1. provider
const provider = new LoggerProvider({
    resource: new Resource({
        'service.name': SERVICE_NAME,
        'service.version': SERVICE_VERSION,
        'deployment.environment': DEPLOYMENT_ENVIRONMENT,
    }),
});

// 2. processor
provider.addLogRecordProcessor(
    new BatchLogRecordProcessor(new OTLPLogExporter({
        url: OTLP_LOGS_PATH
    }), {
        scheduledDelayMillis: 1000,
    })
);

// 3. logger 생성
const logger = provider.getLogger("react-console");

// 4. 로그 전송
logger.emit({
    severityText: "INFO",
    body: "test log from react"
});