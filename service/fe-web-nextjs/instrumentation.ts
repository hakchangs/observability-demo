export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http');
    const { UndiciInstrumentation } = await import('@opentelemetry/instrumentation-undici');

    // Resource, Exporter, BatchSpanProcessor 는 환경변수로 구성
    // OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_TRACES_EXPORTER=otlp
    // OTEL_BSP_SCHEDULE_DELAY=500 (배치 딜레이 단축)
    const sdk = new NodeSDK({
      instrumentations: [
        new HttpInstrumentation(),  // http/https 모듈 (레거시)
        new UndiciInstrumentation(), // fetch() - undici 기반
      ],
    });

    sdk.start();
  }
}