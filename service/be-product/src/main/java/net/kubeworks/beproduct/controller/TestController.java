package net.kubeworks.beproduct.controller;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/test")
public class TestController {

    private static final Logger log = LoggerFactory.getLogger(TestController.class);
    private static final Tracer tracer = GlobalOpenTelemetry.getTracer("be-product");

    @GetMapping("/error")
    public String error(){
        log.error("error", new RuntimeException("error stack"));
        throw new RuntimeException("error");
    }

    @GetMapping("/service")
    public String service(){

        log.info("this is service");

        return "this is service..";
    }

    @GetMapping("/http")
    public String http(){
        log.atInfo()
                .addKeyValue("log_category", "app")
                .addKeyValue("log_type", "http")
                .log("this is http.");
        return "this is http.";
    }

    @GetMapping("/slow")
    public String slow() {
        log.info("slow start");
        long result = 0;
        for (long i = 0; i < 5_000_000_000L; i++) {
            result += ThreadLocalRandom.current().nextLong();
        }
        log.info("slow end result={}", result);
        return "slow: " + result;
    }

    @GetMapping("/slow-sleep")
    public String slowSleep() throws InterruptedException {
        log.info("slow sleep start");

        long sleepTime = 1000 * 30;
        Thread.sleep(sleepTime);
        log.info("slow sleep end. sleepTime={}ms", sleepTime);

        return "slow sleep end";
    }

    @GetMapping("/slow-lock")
    public String slowLock() throws InterruptedException {
        log.info("slow lock start");

        final Object lock = new Object();
        int threadCount = 10;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                for (int j = 0; j < 100; j++) {
                    synchronized (lock) {
                        try {
                            Thread.sleep(10);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        }
                    }
                }
                latch.countDown();
            });
        }

        latch.await();
        executor.shutdown();
        log.info("slow lock end");
        return "slow lock end";
    }

    @GetMapping("/trace-partial")
    public String tracePartial() throws InterruptedException {
        log.info("trace-partial traceId={}", Span.current().getSpanContext().getTraceId());

        // fast-work span: 즉시 완료
        Span fastSpan = tracer.spanBuilder("fast-work").startSpan();
        try (Scope ignored = fastSpan.makeCurrent()) {
            log.info("fast-work start");
            Thread.sleep(200);
            log.info("fast-work end");
        } finally {
            fastSpan.end();
        }

        // slow-work span: 20초 대기 (root span은 아직 진행 중)
        Span slowSpan = tracer.spanBuilder("slow-work").startSpan();
        try (Scope ignored = slowSpan.makeCurrent()) {
            log.info("slow-work start");
            Thread.sleep(50_000);
            log.info("slow-work end");
        } finally {
            slowSpan.end();
        }

        return "trace-partial end";
    }

    @PostMapping("/http-body")
    public Map<String, Object> httpBody(@RequestBody Map<String, Object> body) {
        return Map.of(
                "received", body,
                "message", "ok"
        );
    }

    @GetMapping("/level-debug")
    public String levelDebug() {
        log.debug("print level debug...");
        return "level debug";
    }

}
