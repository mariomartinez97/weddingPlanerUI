package com.example.weddingplanner.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "invitees")
public class InviteeEntity {

    @Id
    @Column(name = "id", length = 50, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invite_id", nullable = false)
    private InviteEntity invite;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "rsvp", nullable = false)
    private String rsvp;

    @Column(name = "meal_choice")
    private String mealChoice;

    @Column(name = "notes")
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public InviteEntity getInvite() { return invite; }
    public void setInvite(InviteEntity invite) { this.invite = invite; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRsvp() { return rsvp; }
    public void setRsvp(String rsvp) { this.rsvp = rsvp; }

    public String getMealChoice() { return mealChoice; }
    public void setMealChoice(String mealChoice) { this.mealChoice = mealChoice; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
