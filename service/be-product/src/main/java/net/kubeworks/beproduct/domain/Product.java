package net.kubeworks.beproduct.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type;

    @Column(length = 500)
    private String description;

    private Long monthlyPremium;
    private String coverage;

    protected Product() {}

    public Product(String name, String type, String description, Long monthlyPremium, String coverage) {
        this.name = name;
        this.type = type;
        this.description = description;
        this.monthlyPremium = monthlyPremium;
        this.coverage = coverage;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public String getDescription() { return description; }
    public Long getMonthlyPremium() { return monthlyPremium; }
    public String getCoverage() { return coverage; }
}
