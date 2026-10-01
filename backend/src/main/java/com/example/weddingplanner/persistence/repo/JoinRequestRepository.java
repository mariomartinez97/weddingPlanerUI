package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.JoinRequestEntity;
import com.example.weddingplanner.persistence.entity.JoinRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JoinRequestRepository extends JpaRepository<JoinRequestEntity, String> {
    List<JoinRequestEntity> findAllByPlanIdAndStatus(String planId, JoinRequestStatus status);
    List<JoinRequestEntity> findAllByUserId(String userId);
    boolean existsByUserIdAndPlanIdAndStatus(String userId, String planId, JoinRequestStatus status);
    long countByUserIdAndPlanIdAndStatus(String userId, String planId, JoinRequestStatus status);
}
