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

// 브라우저 LoggerProvider 에 loglevel 로그를 브리징
// LoggerProvider 는 instrumentation-client.ts 에서 등록
export function setupLogBridge() {
  if (patched) return;
  patched = true;

  // 브라우저 기본 레벨: info (loglevel 기본값은 WARN)
  log.setDefaultLevel('info');

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
        // OTel LoggerProvider 미등록 시 무시
      }
    };
  };
  log.setLevel(log.getLevel());
}