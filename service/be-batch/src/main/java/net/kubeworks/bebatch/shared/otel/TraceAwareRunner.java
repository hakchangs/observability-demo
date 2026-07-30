package net.kubeworks.bebatch.shared.otel;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.batch.autoconfigure.JobLauncherApplicationRunner;
import org.springframework.core.Ordered;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

public class TraceAwareRunner implements ApplicationRunner, Ordered {

    private final Logger log = LoggerFactory.getLogger(TraceAwareRunner.class);
    private static final Tracer TRACER = GlobalOpenTelemetry.getTracer("batch-root");
    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS");

    private final JobLauncherApplicationRunner delegate;
    private final String jobName;

    public TraceAwareRunner(JobLauncherApplicationRunner delegate, String jobName) {
        this.delegate = delegate;
        this.jobName = jobName;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {

        // 1. 부모 trace 정보 준비
        log.debug("start...jobName={}", jobName);
        Context parentContext = extractParentContext();
        String guid = Baggage.fromContext(parentContext).getEntryValue("guid");
        if (guid == null || guid.isBlank()) {
            guid = generateGuid();
        }

        // 2. 부모 trace 기반 span 생성
        Span root = TRACER.spanBuilder(jobName)
                .setParent(parentContext)
                .setSpanKind(SpanKind.CONSUMER)
                .setAttribute("batch.job.name", jobName)
                .setAttribute("guid", guid)
                .startSpan();

        // 3. span 범위내에서 작업 시작
        Context rootContext = parentContext.with(root);
        Baggage newBaggage = Baggage.fromContext(parentContext).toBuilder().put("guid", guid).build();
        try (Scope scope = newBaggage.storeInContext(rootContext).makeCurrent()) {

            log.debug("delegate runner start...args={}", args);
            MDC.put("guid", guid); //log 에 guid 주입설정

            // 배치 실행여부 마킹
            Span started = TRACER.spanBuilder("batch.execution.started")
                    .setParent(Context.current())
                    .setSpanKind(SpanKind.INTERNAL)
                    .setAttribute("batch.job.name", jobName)
                    .setAttribute("guid", guid)
                    .startSpan();
            started.end();

            // JobLauncherApplicationRunner 그대로 실행
            delegate.run(args);

            log.debug("delegate runner end...");

        } catch (Exception e) {
            root.setStatus(StatusCode.ERROR);
            root.recordException(e);
            throw e;
        } finally {
            root.end();
            MDC.remove("guid");
        }
    }

    @Override
    public int getOrder() {
        return delegate.getOrder();
    }

    private Context extractParentContext() {
        String traceParent = System.getenv("TRACE_PARENT");
        //TRACE_PARENT 없는경우 자체 Span 으로 시작.
        if (traceParent == null || traceParent.isBlank()) return Context.root();

        Map<String, String> carrier = new HashMap<>();
        carrier.put("traceparent", traceParent);
        carrier.put("tracestate", System.getenv().getOrDefault("TRACE_STATE", ""));
        carrier.put("baggage", System.getenv().getOrDefault("BAGGAGE", ""));

        return GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.root(), carrier, new TextMapGetter<>() {
                    public Iterable<String> keys(Map<String, String> c) { return c.keySet(); }
                    public String get(Map<String, String> c, String k) { return c == null ? null : c.get(k); }
                });
    }

    private String generateGuid() {
        String timestamp = LocalDateTime.now().format(FORMATTER);
        long random = ThreadLocalRandom.current().nextLong(0, 10_000_000_000L);
        return timestamp + "LTP" + String.format("%010d", random);
    }
}
