export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { setupLogBridge } = await import('./utils/otel/logger.server');
    setupLogBridge();
  }
}