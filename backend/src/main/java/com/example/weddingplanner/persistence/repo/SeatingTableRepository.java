package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.SeatingTableEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatingTableRepository extends JpaRepository<SeatingTableEntity, String> {
    List<SeatingTableEntity> findAllByPlanIdOrderByNameAsc(String planId);
    boolean existsByIdAndPlanId(String id, String planId);
    void deleteByPlanIdAndIdNotIn(String planId, List<String> ids);
    void deleteAllByPlanId(String planId);
}
