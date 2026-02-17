package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.*;
import com.example.weddingplanner.persistence.entity.InviteEntity;
import com.example.weddingplanner.persistence.entity.InviteeEntity;
import com.example.weddingplanner.persistence.repo.InviteRepository;
import com.example.weddingplanner.persistence.repo.InviteeRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class InvitesFacade {

    private final InviteRepository invites;
    private final InviteeRepository invitees;
    private final IdService ids;

    public InvitesFacade(InviteRepository invites, InviteeRepository invitees, IdService ids) {
        this.invites = invites;
        this.invitees = invitees;
        this.ids = ids;
    }

    public List<InviteDto> listAll() {
        return invites.findAll().stream()
                .sorted(Comparator.comparing(InviteEntity::getInviteName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public InviteDto createInvite(CreateInviteRequest req) {
        InviteEntity inv = new InviteEntity();
        inv.setId(ids.uid("inv"));
        inv.setInviteName(req.inviteName().trim());
        if (req.contact() != null) {
            inv.setContactEmail(blankToNull(req.contact().email()));
            inv.setContactPhone(blankToNull(req.contact().phone()));
        }
        inv.setNotes(blankToNull(req.notes()));

        invites.save(inv);

        // Always create primary companion = inviteName (unless already provided as companion with same name)
        boolean hasPrimary = req.companions() != null && req.companions().stream()
                .anyMatch(c -> safeEq(c.fullName(), req.inviteName()));

        if (!hasPrimary) {
            addInvitee(inv.getId(), new CreateInviteeRequest(req.inviteName(), "PENDING", null, null));
        }

        if (req.companions() != null) {
            for (CreateInviteeRequest c : req.companions()) {
                if (c == null || isBlank(c.fullName())) continue;
                // skip duplicate primary if same as inviteName
                if (safeEq(c.fullName(), req.inviteName())) continue;
                addInvitee(inv.getId(), c);
            }
        }

        // refresh with invitees
        InviteEntity loaded = invites.findById(inv.getId()).orElseThrow();
        loaded.setInvitees(invitees.findByInvite_Id(inv.getId()));
        return toDto(loaded);
    }

    @Transactional
    public InviteDto updateInvite(String inviteId, UpdateInviteRequest req) {
        InviteEntity inv = invites.findById(inviteId).orElseThrow();
        String oldInviteName = inv.getInviteName();
        if (req.inviteName() != null && !req.inviteName().trim().isEmpty()) {
            String newInviteName = req.inviteName().trim();
            if (!safeEq(oldInviteName, newInviteName)) {
                List<InviteeEntity> companions = invitees.findByInvite_Id(inv.getId());
                InviteeEntity primary = companions.stream()
                        .filter(c -> safeEq(c.getFullName(), oldInviteName))
                        .findFirst()
                        .orElse(null);

                if (primary != null) {
                    primary.setFullName(newInviteName);
                    invitees.save(primary);
                } else {
                    boolean hasNewPrimary = companions.stream()
                            .anyMatch(c -> safeEq(c.getFullName(), newInviteName));
                    if (!hasNewPrimary) {
                        addInvitee(inv.getId(), new CreateInviteeRequest(newInviteName, "PENDING", null, null));
                    }
                }
            }
            inv.setInviteName(newInviteName);
        }
        if (req.contact() != null) {
            inv.setContactEmail(blankToNull(req.contact().email()));
            inv.setContactPhone(blankToNull(req.contact().phone()));
        }
        inv.setNotes(blankToNull(req.notes()));
        invites.save(inv);
        inv.setInvitees(invitees.findByInvite_Id(inv.getId()));
        return toDto(inv);
    }

    @Transactional
    public void deleteInvite(String inviteId) {
        // child rows are FK cascade delete (orphanRemoval) but ensure via repo
        invites.deleteById(inviteId);
    }

    @Transactional
    public InviteeDto addInvitee(String inviteId, CreateInviteeRequest req) {
        InviteEntity inv = invites.findById(inviteId).orElseThrow();
        InviteeEntity e = new InviteeEntity();
        e.setId(ids.uid("pers"));
        e.setInvite(inv);
        e.setFullName(req.fullName().trim());
        e.setRsvp(normalizeRsvp(req.rsvp()));
        e.setMealChoice(blankToNull(req.mealChoice()));
        e.setNotes(blankToNull(req.notes()));
        invitees.save(e);
        return toDto(e);
    }

    @Transactional
    public InviteeDto updateInvitee(String inviteeId, UpdateInviteeRequest req) {
        InviteeEntity e = invitees.findById(inviteeId).orElseThrow();
        if (req.fullName() != null && !req.fullName().trim().isEmpty()) e.setFullName(req.fullName().trim());
        if (req.rsvp() != null) e.setRsvp(normalizeRsvp(req.rsvp()));
        e.setMealChoice(blankToNull(req.mealChoice()));
        e.setNotes(blankToNull(req.notes()));
        invitees.save(e);
        return toDto(e);
    }

    @Transactional
    public void deleteInvitee(String inviteeId) {
        invitees.deleteById(inviteeId);
    }

    private InviteDto toDto(InviteEntity inv) {
        List<InviteeDto> people = (inv.getInvitees() == null ? List.<InviteeEntity>of() : inv.getInvitees())
                .stream()
                .sorted(Comparator.comparing(InviteeEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();

        return new InviteDto(
                inv.getId(),
                inv.getInviteName(),
                new ContactDto(inv.getContactEmail(), inv.getContactPhone()),
                inv.getNotes(),
                people
        );
    }

    private InviteeDto toDto(InviteeEntity e) {
        return new InviteeDto(
                e.getId(),
                e.getInvite() != null ? e.getInvite().getId() : null,
                e.getFullName(),
                e.getRsvp(),
                e.getMealChoice(),
                e.getNotes()
        );
    }

    private String normalizeRsvp(String rsvp) {
        String v = (rsvp == null ? "" : rsvp).trim().toUpperCase();
        return switch (v) {
            case "YES", "NO", "MAYBE", "PENDING" -> v;
            case "Y" -> "YES";
            case "N" -> "NO";
            case "M" -> "MAYBE";
            default -> "PENDING";
        };
    }

    private static boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }
    private static String blankToNull(String s) { return isBlank(s) ? null : s.trim(); }
    private static boolean safeEq(String a, String b) {
        if (a == null || b == null) return false;
        return a.trim().equalsIgnoreCase(b.trim());
    }
}
