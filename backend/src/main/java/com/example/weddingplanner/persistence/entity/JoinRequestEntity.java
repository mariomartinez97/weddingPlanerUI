package com.example.weddingplanner.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "join_requests")
public class JoinRequestEntity {

    @Id
    @Column(name = "id", length = 50, nullable = false)
    private String id;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "plan_id", length = 50, nullable = false)
    private String planId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private JoinRequestStatus status = JoinRequestStatus.PENDING;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "resolved_by", length = 50)
    private String resolvedBy;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }

    public JoinRequestStatus getStatus() { return status; }
    public void setStatus(JoinRequestStatus status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (status == null) status = JoinRequestStatus.PENDING;
    }
}
