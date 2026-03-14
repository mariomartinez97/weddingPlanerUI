package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, String> {
    List<AuditLogEntity> findAllByPlanIdOrderByCreatedAtDesc(String planId);
}
