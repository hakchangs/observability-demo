package net.kubeworks.beproduct.controller;

import net.kubeworks.beproduct.domain.Product;
import net.kubeworks.beproduct.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private static final Logger log = LoggerFactory.getLogger(ProductController.class);

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<Product> getAll() {
        log.info("action=get_products");
        List<Product> products = productService.findAll();
        log.info("action=get_products status=success count={}", products.size());
        return products;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Long id) {
        log.info("action=get_product id={}", id);
        return productService.findById(id)
                .map(product -> {
                    log.info("action=get_product id={} status=success name=\"{}\"", id, product.getName());
                    return ResponseEntity.ok(product);
                })
                .orElseGet(() -> {
                    log.warn("action=get_product id={} status=not_found", id);
                    return ResponseEntity.notFound().build();
                });
    }
}