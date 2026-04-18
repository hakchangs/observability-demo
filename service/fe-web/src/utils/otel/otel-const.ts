import {runtimeEnv} from "./runtime-env-loader.ts";

export const env = {
    "otel.service.name": runtimeEnv('OTEL_SERVICE_NAME', 'fe-web'),
    "otel.service.version": runtimeEnv('OTEL_SERVICE_VERSION', '0.0.1'),
    "deployment.environment.name": runtimeEnv('OTEL_DEPLOYMENT_ENVIRONMENT_NAME', 'demo'),
    "otel.logs.path": runtimeEnv('OTEL_EXPORTER_OTLP_LOGS_PATH', `${window.location.origin}/v1/logs`),
    "otel.traces.path": runtimeEnv('OTEL_EXPORTER_OTLP_TRACES_PATH', `${window.location.origin}/v1/traces`),
}
