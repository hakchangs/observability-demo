package net.kubeworks.becontroller.service;

import io.fabric8.kubernetes.api.model.batch.v1.CronJob;
import io.fabric8.kubernetes.api.model.batch.v1.Job;
import io.fabric8.kubernetes.api.model.batch.v1.JobBuilder;
import io.fabric8.kubernetes.api.model.batch.v1.JobSpec;
import io.fabric8.kubernetes.client.KubernetesClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class BatchJobLauncher {

    private static final Logger log = LoggerFactory.getLogger(BatchJobLauncher.class);

    private final KubernetesClient client;

    @Value("${batch.namespace:app}")
    private String namespace;

    @Value("${batch.cronjob-name:be-batch-cron}")
    private String cronJobName;

    public BatchJobLauncher(KubernetesClient client) {
        this.client = client;
    }

    public String launch(String jobName) {
        // 1) CronJob 에서 jobTemplate 읽기 (스펙 공유)
        CronJob cron = client.batch().v1().cronjobs()
                .inNamespace(namespace).withName(cronJobName).get();
        if (cron == null) {
            throw new IllegalStateException("CronJob not found: " + cronJobName);
        }
        JobSpec templateSpec = cron.getSpec().getJobTemplate().getSpec();

        // 2) 고유 이름 생성
        String runId = jobName + "-" + Instant.now().toEpochMilli();

        // 3) 템플릿 스펙 재사용 + 실행별 env 주입
        Job job = new JobBuilder()
                .withNewMetadata()
                    .withName(runId)
                    .withNamespace(namespace)
                    .addToLabels("app", "be-batch")
                    .addToLabels("trigger", "on-demand")
                    .addToLabels("batch-job-name", jobName)
                .endMetadata()
                .withSpec(templateSpec)                 // ← 스펙 공유
                .editSpec()
                    .editTemplate().editSpec().editFirstContainer()
                        .addNewEnv()
                        .withName("SPRING_BATCH_JOB_NAME").withValue(jobName)
                        .endEnv()
                    //TODO: TRACE_PARENT 는 5단계에서 여기 추가
                    .endContainer().endSpec().endTemplate()
                .endSpec()
                .build();

        client.batch().v1().jobs().inNamespace(namespace).resource(job).create();
        log.info("launched batch job: run={} jobName={}", runId, jobName);
        return runId;
    }

}
