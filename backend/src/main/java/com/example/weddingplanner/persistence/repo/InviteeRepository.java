package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.InviteeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InviteeRepository extends JpaRepository<InviteeEntity, String> {
    List<InviteeEntity> findByInvite_Id(String inviteId);
    java.util.Optional<InviteeEntity> findByIdAndInvite_PlanId(String inviteeId, String planId);
    boolean existsByIdAndInvite_PlanId(String inviteeId, String planId);
}
