package net.kubeworks.bebatch.config;

//import io.micrometer.core.instrument.MeterRegistry;
//import io.micrometer.core.instrument.observation.DefaultMeterObservationHandler;
//import io.micrometer.observation.ObservationRegistry;
//import io.micrometer.tracing.Tracer;
//import io.micrometer.tracing.handler.DefaultTracingObservationHandler;
//import io.micrometer.tracing.handler.TracingAwareMeterObservationHandler;
//import io.micrometer.tracing.otel.bridge.OtelCurrentTraceContext;
//import io.micrometer.tracing.otel.bridge.OtelTracer;
//import io.opentelemetry.api.GlobalOpenTelemetry;
//import io.opentelemetry.api.OpenTelemetry;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;

//@Configuration
public class OtelConfig {

//    @Bean
//    OpenTelemetry openTelemetry() {
//        return GlobalOpenTelemetry.get();   // agent SDK 재사용 — 이게 핵심
//    }
//
////    @Bean
////    ObservationRegistry observationRegistry(MeterRegistry meterRegistry, Tracer tracer) {
////        var registry = ObservationRegistry.create();
////        registry.observationConfig().observationHandler(
////                new TracingAwareMeterObservationHandler<>(
////                        new DefaultMeterObservationHandler(meterRegistry), tracer));
////        return registry;
////    }
//
//    @Bean
//    ObservationRegistry batchObservationRegistry() {
//        var otel = GlobalOpenTelemetry.get();                 // agent SDK
//        var currentTraceContext = new OtelCurrentTraceContext();
//        var tracer = new OtelTracer(
//                otel.getTracer("spring-batch"),
//                currentTraceContext,
//                event -> {});                                  // EventPublisher no-op
//
//        var registry = ObservationRegistry.create();
//        registry.observationConfig()
//                .observationHandler(new DefaultTracingObservationHandler(tracer));
//        return registry;
//    }
}
