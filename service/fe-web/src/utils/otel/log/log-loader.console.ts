import {
    LoggerProvider,
    BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';

import {
    OTLPLogExporter
} from '@opentelemetry/exporter-logs-otlp-http';
import {resourceFromAttributes} from "@opentelemetry/resources";
import {runtimeEnv} from "../runtime-env-loader.ts";

const OTLP_LOGS_PATH = runtimeEnv('OTEL_EXPORTER_OTLP_LOGS_PATH', `${window.location.origin}/v1/logs`);
const SERVICE_NAME = runtimeEnv('OTEL_SERVICE_NAME', 'fe-web');
const SERVICE_VERSION = runtimeEnv('OTEL_SERVICE_VERSION', '0.0.1');
const DEPLOYMENT_ENVIRONMENT = runtimeEnv('OTEL_DEPLOYMENT_ENVIRONMENT_NAME', 'demo');

const provider = new LoggerProvider({
    resource: resourceFromAttributes({
        'service.name': SERVICE_NAME,
        'service.version': SERVICE_VERSION,
        'deployment.environment': DEPLOYMENT_ENVIRONMENT,
    }),
});

provider.addLogRecordProcessor(
    new BatchLogRecordProcessor(new OTLPLogExporter({
        url: OTLP_LOGS_PATH
    }), {
        scheduledDelayMillis: 1000,
    })
);

// logger 생성
const logger = provider.getLogger("react-console");

// -----------------------------
// console override 핵심 부분
// -----------------------------

const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
};


type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

function sendToOtel(level: LogLevel, args: unknown[]): void {

    try {

        logger.emit({
            severityText: level.toUpperCase(),
            body: args.map(a =>
                typeof a === "object"
                    ? JSON.stringify(a)
                    : String(a)
            ).join(" "),
            attributes: {
                "log.source": "console",
                "log.level": level
            }
        });

    } catch (err) {

        // OTel 실패해도 console은 유지
        originalConsole.error(
            "OTel console logging failed",
            err
        );
    }
}

// log override
console.log = (...args) => {

    originalConsole.log(...args);

    sendToOtel("info", args);
};

console.info = (...args) => {

    originalConsole.info(...args);

    sendToOtel("info", args);
};

console.warn = (...args) => {

    originalConsole.warn(...args);

    sendToOtel("warn", args);
};

console.error = (...args) => {

    originalConsole.error(...args);

    sendToOtel("error", args);
};

console.debug = (...args) => {

    originalConsole.debug(...args);

    sendToOtel("debug", args);
};