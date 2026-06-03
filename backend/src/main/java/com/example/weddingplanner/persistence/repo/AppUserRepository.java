package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.AppUserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUserEntity, String> {
    Optional<AppUserEntity> findByEmailIgnoreCase(String email);
    Optional<AppUserEntity> findByGoogleId(String googleId);
}
