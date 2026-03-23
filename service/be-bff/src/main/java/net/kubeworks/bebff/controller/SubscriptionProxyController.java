package net.kubeworks.bebff.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionProxyController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionProxyController.class);

    private final RestClient subscriptionClient;

    public SubscriptionProxyController(@Qualifier("subscriptionClient") RestClient subscriptionClient) {
        this.subscriptionClient = subscriptionClient;
    }

    @GetMapping
    public ResponseEntity<String> getAll(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        log.info("action=proxy_get_subscriptions downstream=be-subscription userId={} username={}", userId, username);
        long start = System.currentTimeMillis();
        String body = subscriptionClient.get()
                .uri("/api/subscriptions")
                .header("X-User-Id", String.valueOf(userId))
                .retrieve()
                .body(String.class);
        log.info("action=proxy_get_subscriptions downstream=be-subscription userId={} username={} status=200 duration_ms={}",
                userId, username, System.currentTimeMillis() - start);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> getById(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        log.info("action=proxy_get_subscription downstream=be-subscription id={} userId={} username={}", id, userId, username);
        long start = System.currentTimeMillis();
        String body = subscriptionClient.get()
                .uri("/api/subscriptions/{id}", id)
                .header("X-User-Id", String.valueOf(userId))
                .retrieve()
                .body(String.class);
        log.info("action=proxy_get_subscription downstream=be-subscription id={} userId={} username={} status=200 duration_ms={}",
                id, userId, username, System.currentTimeMillis() - start);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}