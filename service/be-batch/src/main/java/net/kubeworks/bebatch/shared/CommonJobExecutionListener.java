package net.kubeworks.bebatch.shared;

import io.opentelemetry.api.baggage.Baggage;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
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

    private static final ThreadLocal<Scope> BAGGAGE_SCOPE = new ThreadLocal<>();

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("beforeJob...");
        JobParameters params = jobExecution.getJobParameters();
        log.info("job params = {}", params.parameters());
        log.info("guid param = {}", params.getString("guid"));

        String guid = params.getString("guid");
        if (guid != null && !guid.isBlank()) {
            MDC.put("guid", guid);
            Baggage baggage = Baggage.current().toBuilder().put("guid", guid).build();
            Scope scope = baggage.storeInContext(Context.current()).makeCurrent();
            BAGGAGE_SCOPE.set(scope);
        }
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        log.info("afterJob...");
        Scope scope = BAGGAGE_SCOPE.get();
        if (scope != null) { scope.close(); BAGGAGE_SCOPE.remove(); }
        MDC.remove("guid");
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
