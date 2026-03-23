package net.kubeworks.besubscription.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "subscription")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long productId;
    private String productName;
    private String productType;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status; // ACTIVE, EXPIRED, CANCELLED
    private Long monthlyPremium;

    protected Subscription() {}

    public Subscription(Long userId, Long productId, String productName, String productType,
                        LocalDate startDate, LocalDate endDate, String status, Long monthlyPremium) {
        this.userId = userId;
        this.productId = productId;
        this.productName = productName;
        this.productType = productType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.monthlyPremium = monthlyPremium;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getProductId() { return productId; }
    public String getProductName() { return productName; }
    public String getProductType() { return productType; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getStatus() { return status; }
    public Long getMonthlyPremium() { return monthlyPremium; }
}
