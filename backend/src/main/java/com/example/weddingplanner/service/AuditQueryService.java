package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.AuditEntryDto;
import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
public class AuditQueryService {

    private final AuditLogRepository audits;
    private final AuthContextService auth;
    private final AppUserRepository users;

    public AuditQueryService(AuditLogRepository audits, AuthContextService auth, AppUserRepository users) {
        this.audits = audits;
        this.auth = auth;
        this.users = users;
    }

    public List<AuditEntryDto> listCurrentPlanAudit() {
        List<com.example.weddingplanner.persistence.entity.AuditLogEntity> rows = audits.findAllByPlanIdOrderByCreatedAtDesc(auth.currentPlanId());
        Map<String, AppUserEntity> usersById = users.findAllById(rows.stream().map(com.example.weddingplanner.persistence.entity.AuditLogEntity::getUserId).distinct().toList())
                .stream()
                .collect(java.util.stream.Collectors.toMap(AppUserEntity::getId, Function.identity()));

        return rows.stream()
                .map(a -> new AuditEntryDto(
                        a.getId(),
                        a.getUserId(),
                        usersById.get(a.getUserId()) != null ? usersById.get(a.getUserId()).getDisplayName() : null,
                        usersById.get(a.getUserId()) != null ? usersById.get(a.getUserId()).getEmail() : null,
                        a.getPlanId(),
                        a.getAction(),
                        a.getEntityType(),
                        a.getEntityId(),
                        a.getSummary(),
                        a.getCreatedAt() != null ? a.getCreatedAt().toString() : null
                ))
                .toList();
    }
}
