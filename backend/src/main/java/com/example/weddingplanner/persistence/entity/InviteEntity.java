package com.example.weddingplanner.persistence.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invites")
public class InviteEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "invite_name", nullable = false)
    private String inviteName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @OneToMany(
            mappedBy = "invite",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<InviteeEntity> invitees = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInviteName() { return inviteName; }
    public void setInviteName(String inviteName) { this.inviteName = inviteName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<InviteeEntity> getInvitees() { return invitees; }

    /**
     * IMPORTANT:
     * With orphanRemoval=true, NEVER replace the collection instance (e.g. this.invitees = newList),
     * otherwise Hibernate can throw:
     * "all-delete-orphan was no longer referenced by the owning entity instance".
     *
     * Always mutate the existing collection instead.
     */
    public void setInvitees(List<InviteeEntity> invitees) {
        this.invitees.clear();
        if (invitees != null) {
            for (InviteeEntity i : invitees) {
                addInvitee(i);
            }
        }
    }

    public void addInvitee(InviteeEntity invitee) {
        if (invitee == null) return;
        if (!this.invitees.contains(invitee)) this.invitees.add(invitee);
        invitee.setInvite(this);
    }

    public void removeInvitee(InviteeEntity invitee) {
        if (invitee == null) return;
        this.invitees.remove(invitee);
        invitee.setInvite(null);
    }
}
