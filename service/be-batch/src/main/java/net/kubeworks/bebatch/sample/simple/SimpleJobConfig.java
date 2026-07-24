package net.kubeworks.bebatch.sample.simple;

import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class SimpleJobConfig {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    public SimpleJobConfig(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        this.jobRepository = jobRepository;
        this.transactionManager = transactionManager;
    }

    @Bean
    public Job simpleJob(Step simpleStep) {
        return new JobBuilder("simpleJob", jobRepository)
                .start(simpleStep)
                .build();
    }

    @Bean
    public Step simpleStep(SimpleTasklet simpleTasklet) {
        return new StepBuilder("simpleStep", jobRepository)
                .tasklet(simpleTasklet, transactionManager)
                .build();
    }
}
