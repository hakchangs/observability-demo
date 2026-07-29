package net.kubeworks.bebatch.shared;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.job.JobExecution;
import org.springframework.batch.core.listener.JobExecutionListener;
import org.springframework.stereotype.Component;

@Component
public class CommonJobExecutionListener implements JobExecutionListener {

    private final Logger log = LoggerFactory.getLogger(CommonJobExecutionListener.class);

    @Override
    public void beforeJob(JobExecution jobExecution) {
        log.info("beforeJob...");
    }

    @Override
    public void afterJob(JobExecution jobExecution) {
        log.info("afterJob...");
    }
}
