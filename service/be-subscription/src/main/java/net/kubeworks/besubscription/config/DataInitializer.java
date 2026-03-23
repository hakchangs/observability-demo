package net.kubeworks.besubscription.config;

import net.kubeworks.besubscription.domain.Subscription;
import net.kubeworks.besubscription.repository.SubscriptionRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class DataInitializer implements ApplicationRunner {

    private final SubscriptionRepository subscriptionRepository;

    public DataInitializer(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (subscriptionRepository.count() > 0) return;

        subscriptionRepository.saveAll(List.of(
                // user1 가입 보험
                new Subscription(1L, 1L, "종신보험 프리미엄", "LIFE",
                        LocalDate.of(2024, 1, 15), null, "ACTIVE", 150_000L),
                new Subscription(1L, 2L, "건강보험 플러스", "HEALTH",
                        LocalDate.of(2023, 6, 1), null, "ACTIVE", 80_000L),
                new Subscription(1L, 3L, "자동차보험 스탠다드", "CAR",
                        LocalDate.of(2023, 3, 1), LocalDate.of(2024, 2, 28), "EXPIRED", 95_000L),

                // user2 가입 보험
                new Subscription(2L, 2L, "건강보험 플러스", "HEALTH",
                        LocalDate.of(2024, 2, 1), null, "ACTIVE", 80_000L),
                new Subscription(2L, 5L, "암보험 안심케어", "HEALTH",
                        LocalDate.of(2024, 3, 15), null, "ACTIVE", 120_000L),
                new Subscription(2L, 4L, "주택화재보험", "HOME",
                        LocalDate.of(2022, 8, 1), LocalDate.of(2024, 7, 31), "EXPIRED", 25_000L)
        ));
    }
}
