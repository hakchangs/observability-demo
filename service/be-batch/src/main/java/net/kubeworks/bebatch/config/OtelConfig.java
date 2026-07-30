package net.kubeworks.bebatch.config;

import io.micrometer.common.KeyValue;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.handler.DefaultTracingObservationHandler;
import io.micrometer.tracing.otel.bridge.OtelCurrentTraceContext;
import io.micrometer.tracing.otel.bridge.OtelTracer;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.baggage.Baggage;
import net.kubeworks.bebatch.shared.otel.TraceAwareRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.batch.autoconfigure.JobLauncherApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OtelConfig {

    private final Logger log = LoggerFactory.getLogger(OtelConfig.class);

    // OTEL Agent - Micrometer 브리지 설정
    @Bean
    Tracer bridgetracer() {
        var otel = GlobalOpenTelemetry.get();   // agent SDK
        var currentTraceContext = new OtelCurrentTraceContext();
        return new OtelTracer(
                otel.getTracer("spring-batch"),
                currentTraceContext,
                event -> {}             // EventPublisher no-op
        );
    }

    // spring-batch Job 실행주기에 otel 연동 wrapping
    @Bean
    static BeanPostProcessor traceContextRunnerWrapper() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String name) {
                if (bean instanceof JobLauncherApplicationRunner runner) {
                    return new TraceAwareRunner(runner);
                }
                return bean;
            }
        };
    }

    // micrometer 수집설정 변경: 수집대상 span 결정, guid 속성 주입
    @Bean
    ObservationRegistry batchObservationRegistry(Tracer tracer) {
        var registry = ObservationRegistry.create();
        var tracingHandler = new DefaultTracingObservationHandler(tracer);
        registry.observationConfig().observationHandler(new ObservationHandler<>() {

            @Override public boolean supportsContext(Observation.Context context) {

                // job, step 만 수집하도록 설정 (chunk read/process/write 제외)

                if (context.getName() == null) return false;
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

        }).observationFilter(context -> {

            Baggage otelBaggage = Baggage.current();

            log.info("[OBS] filter start...baggage={}", otelBaggage);

            // guid span attribute 주입설정
//            String guid  = System.getenv("CORRELATION_GUID");
            String guid = otelBaggage.getEntryValue("guid");
            if (guid != null && !guid.isBlank()) {
                context.addLowCardinalityKeyValue(KeyValue.of("guid", guid));
            }

            log.info("[OBS] filter end...");

            return context;
        });
        return registry;
    }
}
