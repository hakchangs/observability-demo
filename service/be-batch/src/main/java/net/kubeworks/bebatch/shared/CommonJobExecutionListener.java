package net.kubeworks.bebatch.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.job.parameters.JobParameters;
import org.springframework.batch.core.listener.JobExecutionListener;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

@Component
public class CommonJobExecutionListener implements JobExecutionListener, Ordered {

    private final Logger log = LoggerFactory.getLogger(CommonJobExecutionListener.class);

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("beforeJob...");
        JobParameters params = jobExecution.getJobParameters();
        log.info("job params = {}", params.getIdentifyingParameters());
        log.info("guid param = {}", params.getString("guid"));
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        log.info("afterJob...");
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
