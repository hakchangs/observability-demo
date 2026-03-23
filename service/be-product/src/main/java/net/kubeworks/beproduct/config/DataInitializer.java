package net.kubeworks.beproduct.config;

import net.kubeworks.beproduct.domain.Product;
import net.kubeworks.beproduct.repository.ProductRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements ApplicationRunner {

    private final ProductRepository productRepository;

    public DataInitializer(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (productRepository.count() > 0) return;

        productRepository.saveAll(List.of(
                new Product("종신보험 프리미엄", "LIFE",
                        "사망 시 유족에게 보험금을 지급하는 평생 보장 종신보험",
                        150_000L, "사망 시 3억원 지급"),
                new Product("건강보험 플러스", "HEALTH",
                        "입원·수술 실손보험으로 실제 의료비를 보장하는 상품",
                        80_000L, "입원비 일 5만원, 수술비 전액"),
                new Product("자동차보험 스탠다드", "CAR",
                        "대인·대물·자손·자차를 모두 포함한 종합 자동차보험",
                        95_000L, "대인/대물/자손/자차 전액"),
                new Product("주택화재보험", "HOME",
                        "화재·홍수·지진 등 주택 재난을 보장하는 상품",
                        25_000L, "화재/홍수/지진 최대 5억"),
                new Product("암보험 안심케어", "HEALTH",
                        "암 진단부터 치료까지 전 과정을 지원하는 전문 암보험",
                        120_000L, "암 진단금 5000만원, 항암치료비 전액"),
                new Product("실버케어 노인보험", "LIFE",
                        "60세 이상을 위한 맞춤형 노인 전용 보험",
                        200_000L, "요양비 월 100만원, 사망 시 1억원"),
                new Product("어린이보험 해피키즈", "HEALTH",
                        "태아부터 만 15세까지 보장하는 어린이 전용 보험",
                        45_000L, "입원비·수술비 전액, 성장발달 지원금")
        ));
    }
}
