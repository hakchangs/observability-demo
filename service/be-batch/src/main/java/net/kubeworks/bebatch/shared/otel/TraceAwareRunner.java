package net.kubeworks.bebatch.shared.otel;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.batch.autoconfigure.JobLauncherApplicationRunner;
import org.springframework.core.Ordered;

import java.util.HashMap;
import java.util.Map;

public class TraceAwareRunner implements ApplicationRunner, Ordered {

    private final Logger log = LoggerFactory.getLogger(TraceAwareRunner.class);
    private static final Tracer TRACER = GlobalOpenTelemetry.getTracer("batch-root");

    private final JobLauncherApplicationRunner delegate;
    @Value("${spring.batch.job.name:}")
    private String jobName;

    public TraceAwareRunner(JobLauncherApplicationRunner delegate) {
        this.delegate = delegate;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {

        // 1. 부모 trace 정보 준비
        log.info("start...jobName={}", jobName);
        Context parentContext = extractParentContext();

        // 2. 부모 trace 기반 span 생성
        Span root = TRACER.spanBuilder(jobName)
                .setParent(parentContext)
                .setSpanKind(SpanKind.CONSUMER)
                .setAttribute("batch.job.name", jobName)
                .startSpan();

        // 3. span 범위내에서 작업 시작
        try (Scope scope = parentContext.makeCurrent()) {

            log.info("runner start...args={}", args);

            // JobLauncherApplicationRunner 그대로 실행
            delegate.run(args);

            log.info("runner end...");

        } catch (Exception e) {
            root.setStatus(StatusCode.ERROR);
            root.recordException(e);
            throw e;
        } finally {
            root.end();
        }
    }

    @Override
    public int getOrder() {
        return delegate.getOrder();
    }

    private Context extractParentContext() {
        String tp = System.getenv("TRACE_PARENT");
        if (tp == null || tp.isBlank()) return Context.root();

        Map<String, String> carrier = new HashMap<>();
        carrier.put("traceparent", tp);
        carrier.put("tracestate", System.getenv().getOrDefault("TRACE_STATE", ""));

        return GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.root(), carrier, new TextMapGetter<>() {
                    public Iterable<String> keys(Map<String, String> c) { return c.keySet(); }
                    public String get(Map<String, String> c, String k) { return c == null ? null : c.get(k); }
                });
    }
}
