package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PlanRepository extends JpaRepository<PlanEntity, String> {
    List<PlanEntity> findAllByIdInAndStatusOrderByNameAsc(Collection<String> ids, PlanStatus status);
    List<PlanEntity> findAllByStatusOrderByNameAsc(PlanStatus status);
    List<PlanEntity> findAllByOrderByNameAsc();
    boolean existsByIdAndStatus(String id, PlanStatus status);
    Optional<PlanEntity> findByIdAndStatus(String id, PlanStatus status);
}
