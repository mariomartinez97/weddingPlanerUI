package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.PreapprovedEmailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreapprovedEmailRepository extends JpaRepository<PreapprovedEmailEntity, String> {
    List<PreapprovedEmailEntity> findAllByEmailIgnoreCaseAndClaimedFalse(String email);
    List<PreapprovedEmailEntity> findAllByPlanId(String planId);
    boolean existsByEmailIgnoreCaseAndPlanId(String email, String planId);
}
