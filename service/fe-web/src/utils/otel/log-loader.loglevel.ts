import log from "loglevel";
import type { LogLevelNames } from "loglevel";
import { SeverityNumber } from "@opentelemetry/api-logs";
import {BatchLogRecordProcessor, LoggerProvider} from "@opentelemetry/sdk-logs";
import {resourceFromAttributes} from "@opentelemetry/resources";
import {OTLPLogExporter} from "@opentelemetry/exporter-logs-otlp-http";
import {runtimeEnv} from "./runtime-env-loader.ts";

const SEVERITY_MAP: Partial<Record<LogLevelNames, SeverityNumber>> = {
    trace: SeverityNumber.TRACE,
    debug: SeverityNumber.DEBUG,
    info:  SeverityNumber.INFO,
    warn:  SeverityNumber.WARN,
    error: SeverityNumber.ERROR,
};

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