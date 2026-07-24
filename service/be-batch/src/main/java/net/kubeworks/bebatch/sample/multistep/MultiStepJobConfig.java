package net.kubeworks.bebatch.sample.multistep;

import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.StepContribution;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.infrastructure.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class MultiStepJobConfig {

    private final Logger log = LoggerFactory.getLogger(MultiStepJobConfig.class);

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;

    public MultiStepJobConfig(JobRepository jobRepository, PlatformTransactionManager transactionManager) {
        this.jobRepository = jobRepository;
        this.transactionManager = transactionManager;
    }

    @Bean
    public Job multistepJob() {
        return new JobBuilder("multistepJob", jobRepository)
                .start(firstStep())
                .next(secondStep())
                .next(thirdStep())
                .build();
    }

    @Bean
    public Step firstStep() {
        return new StepBuilder("firstStep", jobRepository)
                .tasklet(new Tasklet() {
                    @Override
                    public @Nullable RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) {
                        log.info("[firstStep] start...");

                        // business logic

                        log.info("[firstStep] finish...");
                        return RepeatStatus.FINISHED;
                    }
                }, transactionManager)
                .build();
    }

    @Bean
    public Step secondStep() {
        return new StepBuilder("secondStep", jobRepository)
                .tasklet(new Tasklet() {
                    @Override
                    public @Nullable RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) {
                        log.info("[secondStep] start...");

                        // business logic

                        log.info("[secondStep] finish...");
                        return RepeatStatus.FINISHED;
                    }
                }, transactionManager)
                .build();
    }

    @Bean
    public Step thirdStep() {
        return new StepBuilder("thirdStep", jobRepository)
                .tasklet(new Tasklet() {
                    @Override
                    public @Nullable RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) {
                        log.info("[thirdStep] start...");

                        // business logic

                        log.info("[thirdStep] finish...");
                        return RepeatStatus.FINISHED;
                    }
                }, transactionManager)
                .build();
    }

}
