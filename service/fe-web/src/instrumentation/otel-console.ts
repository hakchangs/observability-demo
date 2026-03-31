import {
    LoggerProvider,
    BatchLogRecordProcessor
} from '@opentelemetry/sdk-logs';

import {
    OTLPLogExporter
} from '@opentelemetry/exporter-logs-otlp-http';
import {Resource} from "@opentelemetry/resources";

function runtimeEnv(key: string, fallback: string): string {
    const val = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key];
    if (val && !val.startsWith('${')) return val;
    return (import.meta.env[key] as string | undefined) ?? fallback;
}

const OTLP_URL = runtimeEnv('VITE_OTLP_LOGS_PATH', '/v1/logs');

// exporter 설정
const exporter = new OTLPLogExporter({
    url: OTLP_URL
});

// provider 생성
const provider = new LoggerProvider({
    resource: new Resource({
        'service.name': runtimeEnv('VITE_SERVICE_NAME', 'fe-web'),
        'service.version': runtimeEnv('VITE_SERVICE_VERSION', '0.0.1'),
        'deployment.environment': runtimeEnv('VITE_DEPLOYMENT_ENV', 'demo'),
    }),
});

provider.addLogRecordProcessor(
    new BatchLogRecordProcessor(exporter)
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