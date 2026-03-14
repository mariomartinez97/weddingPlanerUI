package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserPlanAccessRepository extends JpaRepository<UserPlanAccessEntity, String> {
    List<UserPlanAccessEntity> findAllByUserId(String userId);
    boolean existsByUserIdAndPlanId(String userId, String planId);
}
