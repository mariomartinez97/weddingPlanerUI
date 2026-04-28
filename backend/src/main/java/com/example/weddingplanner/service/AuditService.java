package com.example.weddingplanner.service;

import com.example.weddingplanner.persistence.entity.AuditLogEntity;
import com.example.weddingplanner.persistence.repo.AuditLogRepository;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository audits;
    private final IdService ids;
    private final AuthContextService auth;

    public AuditService(AuditLogRepository audits, IdService ids, AuthContextService auth) {
        this.audits = audits;
        this.ids = ids;
        this.auth = auth;
    }

    public void record(String action, String entityType, String entityId, String summary) {
        recordForActor(auth.currentUserId(), auth.currentPlanId(), action, entityType, entityId, summary);
    }

    public void recordForPlan(String planId, String action, String entityType, String entityId, String summary) {
        recordForActor(auth.currentUserId(), planId, action, entityType, entityId, summary);
    }

    public void recordForActor(String userId, String planId, String action, String entityType, String entityId, String summary) {
        AuditLogEntity entry = new AuditLogEntity();
        entry.setId(ids.uid("audit"));
        entry.setUserId(userId);
        entry.setPlanId(planId);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setSummary(summary);
        audits.save(entry);
    }
}
