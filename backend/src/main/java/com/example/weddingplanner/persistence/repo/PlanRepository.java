package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.PlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlanRepository extends JpaRepository<PlanEntity, String> {
    List<PlanEntity> findAllByIdInOrderByNameAsc(List<String> ids);
}
