package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface UserPlanAccessRepository extends JpaRepository<UserPlanAccessEntity, String> {
    List<UserPlanAccessEntity> findAllByUserId(String userId);
    List<UserPlanAccessEntity> findAllByPlanId(String planId);
    List<UserPlanAccessEntity> findAllByPlanIdIn(Collection<String> planIds);
    boolean existsByUserIdAndPlanId(String userId, String planId);
}
