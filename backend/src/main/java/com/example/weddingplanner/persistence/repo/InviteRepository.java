package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.InviteEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InviteRepository extends JpaRepository<InviteEntity, String> {

    @Override
    @EntityGraph(attributePaths = {"invitees"})
    List<InviteEntity> findAll();
}
