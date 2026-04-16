import { setupLogBridge } from './utils/logger.client';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { logs } from '@opentelemetry/api-logs';

// Trace 설정
import '@/utils/otel/trace-loader.client'

// 브라우저 LoggerProvider 등록 → setupLogBridge 가 이 provider 를 통해 Loki 로 전송
// const loggerProvider = new LoggerProvider({ resource });
// loggerProvider.addLogRecordProcessor(
//   new BatchLogRecordProcessor(
//     new OTLPLogExporter({ url: `${window.location.origin}/api/otlp/v1/logs` }),
//   ),
// );
// logs.setGlobalLoggerProvider(loggerProvider);
//
// setupLogBridge();