package net.kubeworks.bebatch.config;

import io.micrometer.observation.ObservationRegistry;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.handler.DefaultTracingObservationHandler;
import io.micrometer.tracing.otel.bridge.OtelCurrentTraceContext;
import io.micrometer.tracing.otel.bridge.OtelTracer;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OtelConfig {

    private final Logger log = LoggerFactory.getLogger(OtelConfig.class);

    @Bean
    OpenTelemetry openTelemetry() {
        return GlobalOpenTelemetry.get();   // agent SDK 재사용 — 이게 핵심
    }

    @Bean
    Tracer tracer() {
        var otel = GlobalOpenTelemetry.get();   // agent SDK
        var currentTraceContext = new OtelCurrentTraceContext();
        return new OtelTracer(
                otel.getTracer("spring-batch"),
                currentTraceContext,
                event -> {}             // EventPublisher no-op
        );
    }

    @Bean
    ObservationRegistry batchObservationRegistry(Tracer tracer) {
        var registry = ObservationRegistry.create();
        DefaultTracingObservationHandler observationHandler = new DefaultTracingObservationHandler(tracer);
        registry.observationConfig()
                .observationHandler(observationHandler)
                .observationPredicate((name, context) -> {
                    // span name 특정하여 수집 (metrics 수집에도 반영됨)
                    log.info("[OBS Span Name] {}", name);
                    return name.equals("spring.batch.job") || name.equals("spring.batch.step");
                });
        return registry;
    }
}
