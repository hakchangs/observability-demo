package net.kubeworks.bebatch.config;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
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

    //방법1. predicate 필터링: span 외 metrics 수집에도 제외규칙 적용됨
//    @Bean
//    ObservationRegistry batchObservationRegistry(Tracer tracer) {
//        var registry = ObservationRegistry.create();
//        DefaultTracingObservationHandler observationHandler = new DefaultTracingObservationHandler(tracer);
//        registry.observationConfig()
//                .observationHandler(observationHandler)
//                .observationPredicate((name, context) -> {
//                    // span name 특정하여 수집 (metrics 수집에도 반영됨)
//                    log.info("[OBS Span Name] {}", name);
//                    return name.equals("spring.batch.job") || name.equals("spring.batch.step");
//                });
//        return registry;
//    }

    //방법2. handler 오버라이딩 필터링: span 만 수집제외
    @Bean
    ObservationRegistry batchObservationRegistry(Tracer tracer) {
        var registry = ObservationRegistry.create();
        var tracingHandler = new DefaultTracingObservationHandler(tracer);
        registry.observationConfig().observationHandler(new ObservationHandler<>() {
            @Override public boolean supportsContext(Observation.Context context) {
                if (context.getName() != null) return false;
                var name = context.getName();
                log.info("[OBS] name={}, contextual={}, lowKeys={}",
                        context.getName(), context.getContextualName(), context.getLowCardinalityKeyValues());
                return (name.equals("spring.batch.job") || name.equals("spring.batch.step"))
                        && tracingHandler.supportsContext(context);
            }
            @Override public void onStart(Observation.Context context) { tracingHandler.onStart(context); }
            @Override public void onStop(Observation.Context context) { tracingHandler.onStop(context); }
            @Override public void onError(Observation.Context context) { tracingHandler.onError(context); }
            @Override public void onScopeOpened(Observation.Context context) { tracingHandler.onScopeOpened(context); }
            @Override public void onScopeClosed(Observation.Context context) { tracingHandler.onScopeClosed(context); }
        });
        registry.observationConfig()
                .observationHandler(tracingHandler);
        return registry;
    }
}
