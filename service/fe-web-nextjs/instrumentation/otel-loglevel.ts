import log from 'loglevel';
import type { LogLevelNames } from 'loglevel';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';

function runtimeEnv(key: string, fallback: string): string {
  const val = (window as unknown as { __ENV__?: Record<string, string> }).__ENV__?.[key];
  if (val && !val.startsWith('${')) return val;
  return (process.env[key] as string | undefined) ?? fallback;
}

const OTLP_URL = runtimeEnv('NEXT_PUBLIC_OTLP_LOGS_PATH', '/v1/logs');

const exporter = new OTLPLogExporter({ url: OTLP_URL });

const provider = new LoggerProvider({
  resource: new Resource({
    'service.name': runtimeEnv('NEXT_PUBLIC_SERVICE_NAME', 'fe-web-nextjs'),
    'service.version': runtimeEnv('NEXT_PUBLIC_SERVICE_VERSION', '0.0.1'),
    'deployment.environment': runtimeEnv('NEXT_PUBLIC_DEPLOYMENT_ENV', 'demo'),
  }),
});

provider.addLogRecordProcessor(new BatchLogRecordProcessor(exporter));

const SEVERITY_MAP: Partial<Record<LogLevelNames, SeverityNumber>> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

const originalFactory = log.methodFactory;

log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  const logger = provider.getLogger(
    typeof loggerName === 'symbol' ? loggerName.toString() : loggerName
  );

  return function (...args: unknown[]): void {
    rawMethod(...args);
    try {
      logger.emit({
        severityNumber: SEVERITY_MAP[methodName] ?? SeverityNumber.INFO,
        severityText: methodName.toUpperCase(),
        body: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
        attributes: { 'log.source': 'loglevel', 'log.level': methodName },
      });
    } catch (err) {
      console.error('OTel loglevel logging failed', err);
    }
  };
};

log.setLevel('info');