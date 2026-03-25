package net.kubeworks.besubscription.kafka;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class ProductEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(ProductEventConsumer.class);

    @KafkaListener(topics = "product.viewed", groupId = "be-subscription")
    public void onProductViewed(String productId) {
        log.info("product.viewed event received: productId={}", productId);
    }
}