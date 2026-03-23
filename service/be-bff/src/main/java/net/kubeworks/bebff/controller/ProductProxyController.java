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
@RequestMapping("/api/products")
public class ProductProxyController {

    private static final Logger log = LoggerFactory.getLogger(ProductProxyController.class);

    private final RestClient productClient;

    public ProductProxyController(@Qualifier("productClient") RestClient productClient) {
        this.productClient = productClient;
    }

    @GetMapping
    public ResponseEntity<String> getAll(HttpServletRequest request) {
        String username = (String) request.getAttribute("username");
        log.info("action=proxy_get_products downstream=be-product username={}", username);
        long start = System.currentTimeMillis();
        String body = productClient.get()
                .uri("/api/products")
                .retrieve()
                .body(String.class);
        log.info("action=proxy_get_products downstream=be-product username={} status=200 duration_ms={}",
                username, System.currentTimeMillis() - start);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<String> getById(@PathVariable Long id, HttpServletRequest request) {
        String username = (String) request.getAttribute("username");
        log.info("action=proxy_get_product downstream=be-product id={} username={}", id, username);
        long start = System.currentTimeMillis();
        String body = productClient.get()
                .uri("/api/products/{id}", id)
                .retrieve()
                .body(String.class);
        log.info("action=proxy_get_product downstream=be-product id={} username={} status=200 duration_ms={}",
                id, username, System.currentTimeMillis() - start);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}