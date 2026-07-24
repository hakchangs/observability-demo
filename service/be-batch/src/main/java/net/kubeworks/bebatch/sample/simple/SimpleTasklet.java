package net.kubeworks.bebatch.sample.simple;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.batch.core.scope.context.ChunkContext;
import org.springframework.batch.core.step.StepContribution;
import org.springframework.batch.core.step.tasklet.Tasklet;
import org.springframework.batch.infrastructure.repeat.RepeatStatus;
import org.springframework.stereotype.Component;

@Component
public class SimpleTasklet implements Tasklet {

    private static final Logger log = LoggerFactory.getLogger(SimpleTasklet.class);

    @Override
    public RepeatStatus execute(StepContribution contribution, ChunkContext chunkContext) throws Exception {
        String jobName = chunkContext.getStepContext().getJobName();
        long instanceId = chunkContext.getStepContext().getStepExecution().getJobExecution().getJobInstance().getInstanceId();

        // otel custom 필요한 경우 참고
//        Span span = Span.current();
//        span.setAttribute("batch.job.name", jobName);
//        span.setAttribute("batch.job.instance.id", instanceId);

        log.info("batch job started: job={}, instanceId={}", jobName, instanceId);

        // 실제 처리 영역 (샘플: 100건 시뮬레이션)
        int processed = 0;
        for (int i = 0; i < 100; i++) {
            processed++;
        }

        contribution.incrementWriteCount(processed);
//        span.setAttribute("batch.items.processed", processed);
        log.info("batch job completed: job={}, processed={}", jobName, processed);

        return RepeatStatus.FINISHED;
    }
}
