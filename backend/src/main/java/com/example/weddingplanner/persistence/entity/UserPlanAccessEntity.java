package com.example.weddingplanner.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_plan_access")
public class UserPlanAccessEntity {

    @Id
    @Column(name = "id", length = 50, nullable = false)
    private String id;

    @Column(name = "user_id", length = 50, nullable = false)
    private String userId;

    @Column(name = "plan_id", length = 50, nullable = false)
    private String planId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_role", length = 40, nullable = false)
    private PlanAccessRole accessRole = PlanAccessRole.MEMBER;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }

    public PlanAccessRole getAccessRole() { return accessRole; }
    public void setAccessRole(PlanAccessRole accessRole) { this.accessRole = accessRole; }
}
