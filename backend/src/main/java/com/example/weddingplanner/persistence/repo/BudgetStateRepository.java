package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.BudgetStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BudgetStateRepository extends JpaRepository<BudgetStateEntity, String> {
}
