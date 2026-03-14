package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.SeatingAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatingAssignmentRepository extends JpaRepository<SeatingAssignmentEntity, String> {
    List<SeatingAssignmentEntity> findAllByPlanIdOrderByTableIdAscInviteeIdAsc(String planId);
    void deleteAllByPlanId(String planId);
}
