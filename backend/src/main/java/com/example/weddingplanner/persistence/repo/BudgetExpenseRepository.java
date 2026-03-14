package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.BudgetExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BudgetExpenseRepository extends JpaRepository<BudgetExpenseEntity, String> {
    List<BudgetExpenseEntity> findAllByPlanIdOrderByCategoryAsc(String planId);
    java.util.Optional<BudgetExpenseEntity> findByIdAndPlanId(String id, String planId);
    void deleteAllByPlanId(String planId);
}
