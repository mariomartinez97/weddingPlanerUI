package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.AuthSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, String> {
    Optional<AuthSessionEntity> findByToken(String token);
    void deleteByToken(String token);
    void deleteByExpiresAtBefore(OffsetDateTime timestamp);
    void deleteAllByUserId(String userId);
}
