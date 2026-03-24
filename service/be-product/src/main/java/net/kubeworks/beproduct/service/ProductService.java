package net.kubeworks.beproduct.service;

import net.kubeworks.beproduct.domain.Product;
import net.kubeworks.beproduct.repository.ProductRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public ProductService(ProductRepository productRepository, KafkaTemplate<String, String> kafkaTemplate) {
        this.productRepository = productRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Cacheable("products")
    public List<Product> findAll() {
        List<Product> products = productRepository.findAll();
        kafkaTemplate.send("product.viewed", "all");
        return products;
    }

    public Optional<Product> findById(Long id) {
        kafkaTemplate.send("product.viewed", String.valueOf(id));
        return productRepository.findById(id);
    }
}
