package net.kubeworks.becontroller.controller;

import net.kubeworks.becontroller.service.BatchJobLauncher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/internal/batch")
public class BatchTriggerController {

    private final BatchJobLauncher launcher;

    public BatchTriggerController(BatchJobLauncher launcher) {
        this.launcher = launcher;
    }

    // EX.
    // curl -X POST <>/internal/batch/trigger -H "Content-Type: application/json" -d '{"jobName": "simpleJob"}'
    @PostMapping("/trigger")
    public ResponseEntity<Map<String, String>> trigger(@RequestBody TriggerRequest req) {
        String runId = launcher.launch(req.jobName());
        return ResponseEntity.accepted()
                .body(Map.of("runId", runId, "status", "launched"));
    }

    public record TriggerRequest(String jobName) {}
}
