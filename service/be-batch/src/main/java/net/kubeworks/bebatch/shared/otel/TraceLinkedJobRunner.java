package net.kubeworks.bebatch.shared.otel;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.*;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import org.slf4j.MDC;
import org.springframework.batch.core.configuration.JobRegistry;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

// 활성시 확인사항
// - spring.batch.job.enabled=false 반영
//@Component
public class TraceLinkedJobRunner implements ApplicationRunner {

    private static final Tracer TRACER = GlobalOpenTelemetry.getTracer("batch-root");

    private final JobOperator jobOperator;
    private final JobRegistry jobRegistry;

    @Value("${spring.batch.job.name:}") private String jobName;

    public TraceLinkedJobRunner(JobOperator jobOperator, JobRegistry jobRegistry) {
        this.jobOperator = jobOperator;
        this.jobRegistry = jobRegistry;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        SpanContext linked = extractLinkedContext();

        SpanBuilder builder = TRACER.spanBuilder(jobName)
                .setSpanKind(SpanKind.CONSUMER)          // 비동기 작업 소비 의미
                .setAttribute("batch.job.name", jobName);

        if (linked.isValid()) {
            builder.addLink(linked);                     // 컨트롤러 trace 로 연결
        }

        Span root = builder.startSpan();
        try (Scope ignored = root.makeCurrent()) {

            String guid = System.getenv("CORRELATION_GUID");
            if (guid != null) MDC.put("guid", guid);

            Job job = jobRegistry.getJob(jobName);       // 없으면 예외 → 파드 Failed
            jobOperator.start(job, new JobParametersBuilder()
                    .addString("runDate", LocalDate.now().toString())
                    .toJobParameters());
        } catch (Exception e) {
            root.setStatus(StatusCode.ERROR);
            root.recordException(e);
            throw e;
        } finally {
            MDC.remove("guid");
            root.end();
        }
    }

    private SpanContext extractLinkedContext() {
        String tp = System.getenv("TRACE_PARENT");
        if (tp == null || tp.isBlank()) return SpanContext.getInvalid();   // cron 경로

        Map<String, String> carrier = new HashMap<>();
        carrier.put("traceparent", tp);
        carrier.put("tracestate", System.getenv().getOrDefault("TRACE_STATE", ""));

        Context ctx = GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.root(), carrier, new TextMapGetter<>() {
                    public Iterable<String> keys(Map<String, String> c) { return c.keySet(); }
                    public String get(Map<String, String> c, String k) { return c == null ? null : c.get(k); }
                });
        return Span.fromContext(ctx).getSpanContext();
    }
}
