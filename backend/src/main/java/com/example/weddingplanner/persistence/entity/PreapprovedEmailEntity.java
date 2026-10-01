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
@Table(name = "preapproved_emails")
public class PreapprovedEmailEntity {

    @Id
    @Column(name = "id", length = 50, nullable = false)
    private String id;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "plan_id", length = 50, nullable = false)
    private String planId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 30, nullable = false)
    private PlanAccessRole role = PlanAccessRole.MEMBER;

    @Column(name = "created_by", length = 50, nullable = false)
    private String createdBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @Column(name = "claimed", nullable = false)
    private boolean claimed = false;

    @Column(name = "claimed_at")
    private OffsetDateTime claimedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }

    public PlanAccessRole getRole() { return role; }
    public void setRole(PlanAccessRole role) { this.role = role; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isClaimed() { return claimed; }
    public void setClaimed(boolean claimed) { this.claimed = claimed; }

    public OffsetDateTime getClaimedAt() { return claimedAt; }
    public void setClaimedAt(OffsetDateTime claimedAt) { this.claimedAt = claimedAt; }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
