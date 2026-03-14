package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.AppointmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppointmentRepository extends JpaRepository<AppointmentEntity, String> {
    List<AppointmentEntity> findAllByPlanIdOrderByStartAtAsc(String planId);
    java.util.Optional<AppointmentEntity> findByIdAndPlanId(String id, String planId);
    void deleteAllByPlanId(String planId);
}
