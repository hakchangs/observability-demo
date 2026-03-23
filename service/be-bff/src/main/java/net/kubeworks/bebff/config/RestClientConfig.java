package net.kubeworks.bebff.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${services.auth-url}")
    private String authUrl;

    @Value("${services.product-url}")
    private String productUrl;

    @Value("${services.subscription-url}")
    private String subscriptionUrl;

    @Bean("authClient")
    public RestClient authClient() {
        return RestClient.builder().baseUrl(authUrl).build();
    }

    @Bean("productClient")
    public RestClient productClient() {
        return RestClient.builder().baseUrl(productUrl).build();
    }

    @Bean("subscriptionClient")
    public RestClient subscriptionClient() {
        return RestClient.builder().baseUrl(subscriptionUrl).build();
    }
}
