package net.kubeworks.beproduct.repository;

import net.kubeworks.beproduct.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {}
