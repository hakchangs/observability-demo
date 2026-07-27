package net.kubeworks.bebatch.sample.longrunning;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.job.Job;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.Step;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.infrastructure.repeat.RepeatStatus;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
public class LongRunningProbeJobConfig {

    private static final Logger log = LoggerFactory.getLogger(LongRunningProbeJobConfig.class);

    private final JobRepository jobRepository;
    private final PlatformTransactionManager tx;

    public LongRunningProbeJobConfig(JobRepository jobRepository, PlatformTransactionManager tx) {
        this.jobRepository = jobRepository;
        this.tx = tx;
    }

    @Bean
    Job longProbeJob() {
        return new JobBuilder("longProbeJob", jobRepository)
                .start(probeStep1())
                .next(probeSlowStep())
                .next(probeStep3())
                .build();
    }

    @Bean
    Step probeStep1() {
        return new StepBuilder("probeStep1", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("[STEP1] start");
                    Thread.sleep(3000);
                    log.info("[STEP1] done");
                    return RepeatStatus.FINISHED;
                }, tx).build();
    }

    @Bean
    Step probeSlowStep() {
        return new StepBuilder("probeSlowStep", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("[SLOW] start — sleeping 60s");
                    // 10초마다 heartbeat 로그 — idle 판정 및 실시간 확인용
                    for (int i = 1; i <= 6; i++) {
                        Thread.sleep(10_000);
                        log.info("[SLOW] heartbeat {}/6", i);
                    }
                    log.info("[SLOW] done");
                    return RepeatStatus.FINISHED;
                }, tx).build();
    }

    @Bean
    Step probeStep3() {
        return new StepBuilder("probeStep3", jobRepository)
                .tasklet((c, ctx) -> {
                    log.info("[STEP3] start");
                    Thread.sleep(3000);
                    log.info("[STEP3] done");
                    return RepeatStatus.FINISHED;
                }, tx).build();
    }
}
