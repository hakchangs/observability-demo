package net.kubeworks.besubscription.service;

import net.kubeworks.besubscription.domain.Subscription;
import net.kubeworks.besubscription.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    public List<Subscription> findByUserId(Long userId) {
        return subscriptionRepository.findByUserId(userId);
    }

    public Optional<Subscription> findById(Long id) {
        return subscriptionRepository.findById(id);
    }
}
