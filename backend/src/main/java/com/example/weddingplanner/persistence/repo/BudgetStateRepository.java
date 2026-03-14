package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.BudgetStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BudgetStateRepository extends JpaRepository<BudgetStateEntity, String> {
    Optional<BudgetStateEntity> findByPlanId(String planId);
}
