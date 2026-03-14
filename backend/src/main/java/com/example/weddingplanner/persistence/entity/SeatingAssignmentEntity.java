package com.example.weddingplanner.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "seating_assignments")
public class SeatingAssignmentEntity {

    @Id
    @Column(name = "invitee_id", length = 50, nullable = false)
    private String inviteeId;

    @Column(name = "table_id", length = 50, nullable = false)
    private String tableId;

    @Column(name = "seat_number")
    private Integer seatNumber;

    @Column(name = "plan_id", nullable = false, length = 50)
    private String planId;

    public String getInviteeId() { return inviteeId; }
    public void setInviteeId(String inviteeId) { this.inviteeId = inviteeId; }

    public String getTableId() { return tableId; }
    public void setTableId(String tableId) { this.tableId = tableId; }

    public Integer getSeatNumber() { return seatNumber; }
    public void setSeatNumber(Integer seatNumber) { this.seatNumber = seatNumber; }

    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }
}
