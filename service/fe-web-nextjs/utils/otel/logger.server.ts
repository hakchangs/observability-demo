import log, {type LogLevelNames} from 'loglevel';
import {logs, SeverityNumber} from '@opentelemetry/api-logs';
import {IncomingMessage, ServerResponse} from "http";

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


// 속성(attrs)추가 가능한 logger 추가
function logWithAttrs(loggerName: string, level: LogLevelNames, body: string, attrs: Record<string, string | number>) {
  const otelLogger = logs.getLogger(loggerName);
  otelLogger.emit({
    severityNumber: SEVERITY[level],
    severityText: level.toUpperCase(),
    body,
    attributes: attrs,
  });
}


// HTTP 인아웃 로거 생성
function logHttpInout(body: string, attrs: Record<string, string | number>) {
  console.debug(body); //표준출력에 함께 노출
  logWithAttrs("http-inout", "debug", body, {
    log_category: "app",
    event_type: "http",
    ...attrs,
  });
}

export function logHttpRequest(request: IncomingMessage, requestBody: string, guid: string) {

  const {method, url, headers: requestHeaders} = request;
  const requestHeadersFlat = Object.entries(requestHeaders)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`).join(", ");

  logHttpInout(`req=${requestBody}`, {
    "http.event": "request",
    "http.method": method ?? "",
    "http.url": url ?? "",
    "http.request.headers": requestHeadersFlat,
    "guid": guid,
  });
}

export function logHttpResponse(request: IncomingMessage, response: ServerResponse, responseBody: string, guid: string) {

  const {method, url} = request;
  const {statusCode} = response;

  const responseHeadersFlat = Object.entries(response.getHeaders())
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v}`).join(", ");

  logHttpInout(`res=${responseBody}`, {
    "http.event": "response",
    "http.method": method ?? "",
    "http.response.headers": responseHeadersFlat,
    "http.url": url ?? "",
    "http.status": statusCode,
    "guid": guid,
  });
}



