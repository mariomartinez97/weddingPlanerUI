package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.InviteEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InviteRepository extends JpaRepository<InviteEntity, String> {

    @EntityGraph(attributePaths = {"invitees"})
    List<InviteEntity> findAllByPlanId(String planId);

    @EntityGraph(attributePaths = {"invitees"})
    Optional<InviteEntity> findByIdAndPlanId(String id, String planId);
}
