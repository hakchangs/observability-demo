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

// K8s operator 가 주입한 LoggerProvider 에 loglevel 로그를 브리징
export function setupLogBridge() {
  if (patched) return;
  patched = true;

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
        // OTel not initialized yet — ignore
      }
    };
  };
  log.setLevel(log.getLevel());
}