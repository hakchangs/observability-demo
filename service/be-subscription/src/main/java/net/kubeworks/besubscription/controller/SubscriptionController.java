package net.kubeworks.besubscription.controller;

import net.kubeworks.besubscription.domain.Subscription;
import net.kubeworks.besubscription.service.SubscriptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    public List<Subscription> getByUser(@RequestHeader("X-User-Id") Long userId) {
        log.info("action=get_subscriptions userId={}", userId);
        List<Subscription> subscriptions = subscriptionService.findByUserId(userId);
        log.info("action=get_subscriptions userId={} status=success count={}", userId, subscriptions.size());
        return subscriptions;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subscription> getById(@PathVariable Long id) {
        log.info("action=get_subscription id={}", id);
        return subscriptionService.findById(id)
                .map(sub -> {
                    log.info("action=get_subscription id={} userId={} status=success name=\"{}\"",
                            id, sub.getUserId(), sub.getProductName());
                    return ResponseEntity.ok(sub);
                })
                .orElseGet(() -> {
                    log.warn("action=get_subscription id={} status=not_found", id);
                    return ResponseEntity.notFound().build();
                });
    }
}