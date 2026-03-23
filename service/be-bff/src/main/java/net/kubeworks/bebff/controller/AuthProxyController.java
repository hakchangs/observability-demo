package net.kubeworks.bebff.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@RestController
@RequestMapping("/api/auth")
public class AuthProxyController {

    private static final Logger log = LoggerFactory.getLogger(AuthProxyController.class);

    private final RestClient authClient;

    public AuthProxyController(@Qualifier("authClient") RestClient authClient) {
        this.authClient = authClient;
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody String body) {
        log.info("action=proxy_login downstream=be-auth");
        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = authClient.post()
                    .uri("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toEntity(String.class);
            log.info("action=proxy_login downstream=be-auth status={} duration_ms={}",
                    response.getStatusCode().value(), System.currentTimeMillis() - start);
            return ResponseEntity.status(response.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());
        } catch (RestClientResponseException e) {
            log.warn("action=proxy_login downstream=be-auth status={} duration_ms={} reason=\"{}\"",
                    e.getStatusCode().value(), System.currentTimeMillis() - start, e.getMessage());
            return ResponseEntity.status(e.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(e.getResponseBodyAsString());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout() {
        log.info("action=proxy_logout downstream=be-auth");
        long start = System.currentTimeMillis();
        String body = authClient.post()
                .uri("/api/auth/logout")
                .retrieve()
                .body(String.class);
        log.info("action=proxy_logout downstream=be-auth status=200 duration_ms={}", System.currentTimeMillis() - start);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}