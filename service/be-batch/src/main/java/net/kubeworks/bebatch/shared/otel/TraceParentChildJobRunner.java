package net.kubeworks.bebatch.shared.otel;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.*;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.parameters.JobParametersBuilder;
import org.springframework.batch.core.launch.JobOperator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

//@Component
public class TraceParentChildJobRunner implements ApplicationRunner {

    private static final Tracer TRACER = GlobalOpenTelemetry.getTracer("batch-root");

    private final JobOperator jobOperator;
    private final Map<String, Job> jobs;

    @Value("${spring.batch.job.name:}") private String jobName;

    public TraceParentChildJobRunner(JobOperator jobOperator, Map<String, Job> jobs) {
        this.jobOperator = jobOperator;
        this.jobs = jobs;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Context parentContext = extractParentContext();   // 원격 컨텍스트 복원

        Span root = TRACER.spanBuilder(jobName)
                .setParent(parentContext)                  // ← link 대신 부모로 지정
                .setSpanKind(SpanKind.CONSUMER)
                .setAttribute("batch.job.name", jobName)
                .startSpan();

        try (Scope ignored = root.makeCurrent()) {
            Job job = resolveJob(jobName);
            jobOperator.start(job, new JobParametersBuilder()
                    .addString("runDate", LocalDate.now().toString())
                    .toJobParameters());
        } catch (Exception e) {
            root.setStatus(StatusCode.ERROR);
            root.recordException(e);
            throw e;
        } finally {
            root.end();
        }
    }

    private Context extractParentContext() {
        String tp = System.getenv("TRACE_PARENT");
        if (tp == null || tp.isBlank()) return Context.root();   // cron 경로 → 새 trace

        Map<String, String> carrier = new HashMap<>();
        carrier.put("traceparent", tp);
        carrier.put("tracestate", System.getenv().getOrDefault("TRACE_STATE", ""));

        return GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.root(), carrier, new TextMapGetter<>() {
                    public Iterable<String> keys(Map<String, String> c) { return c.keySet(); }
                    public String get(Map<String, String> c, String k) { return c == null ? null : c.get(k); }
                });
    }

    private Job resolveJob(String requested) {
        return jobs.values().stream()
                .filter(j -> j.getName().equals(requested))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Unknown job: '%s'. Available: %s".formatted(
                                requested, jobs.values().stream().map(Job::getName).toList())));
    }
}
