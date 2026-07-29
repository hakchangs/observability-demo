package net.kubeworks.bebatch.shared;

import io.micrometer.tracing.BaggageInScope;
import io.micrometer.tracing.Tracer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.listener.JobExecutionListener;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

@Component
public class CommonJobExecutionListener implements JobExecutionListener, Ordered {

    private final Logger log = LoggerFactory.getLogger(CommonJobExecutionListener.class);

    private final Tracer tracer;
    private BaggageInScope guidBaggage;

    public CommonJobExecutionListener(Tracer tracer) {
        this.tracer = tracer;
    }

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("beforeJob...");
        JobParameters params = jobExecution.getJobParameters();
        log.info("job params = {}", params.parameters());
        log.info("guid param = {}", params.getString("guid"));

        String guid = params.getString("guid");
        if (guid != null && !guid.isBlank()) {
            // Micrometer 계층에서 baggage 생성 + scope 오픈
            this.guidBaggage = tracer.createBaggageInScope("guid", guid);
            MDC.put("guid", guid);   // 로그용은 명시적으로
        }
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        log.info("afterJob...");

        if (guidBaggage != null) {
            try {
                guidBaggage.close();
            } catch (Exception e) {
                log.warn("baggage close failed", e);
            } finally {
                guidBaggage = null;
            }
        }
        MDC.remove("guid");
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
