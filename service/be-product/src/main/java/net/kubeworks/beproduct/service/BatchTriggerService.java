package net.kubeworks.beproduct.service;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class BatchTriggerService {

    private final RestClient restClient;

    public BatchTriggerService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl("http://be-controller:8080")
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    public boolean triggerLongRunningProbeJob() {
        ResponseEntity<BatchResponse> responseEntity = restClient.post()
                .uri("/internal/batch/trigger")
                .body(new BatchRequest("longProbeJob"))
                .retrieve()
                .toEntity(BatchResponse.class);
        HttpStatusCode statusCode = responseEntity.getStatusCode();
        return statusCode.is2xxSuccessful();
    }

    record BatchRequest (
            String jobName
    ) {}

    record BatchResponse (
       String runId, String status
    ) {}
}
