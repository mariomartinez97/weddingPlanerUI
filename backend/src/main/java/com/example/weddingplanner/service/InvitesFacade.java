package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.*;
import com.example.weddingplanner.persistence.entity.InviteEntity;
import com.example.weddingplanner.persistence.entity.InviteeEntity;
import com.example.weddingplanner.persistence.repo.InviteRepository;
import com.example.weddingplanner.persistence.repo.InviteeRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.Locale;
import java.util.List;

@Service
public class InvitesFacade {

    private final InviteRepository invites;
    private final InviteeRepository invitees;
    private final IdService ids;
    private final AuthContextService auth;
    private final AuditService audit;

    public InvitesFacade(InviteRepository invites, InviteeRepository invitees, IdService ids, AuthContextService auth, AuditService audit) {
        this.invites = invites;
        this.invitees = invitees;
        this.ids = ids;
        this.auth = auth;
        this.audit = audit;
    }

    public List<InviteDto> listAll() {
        return listAllForPlan(auth.currentPlanId());
    }

    public List<InviteDto> searchByName(String q) {
        return searchByNameForPlan(auth.currentPlanId(), q);
    }

    public List<PublicInviteDto> searchPublicByName(String planId, String q) {
        return searchInvites(planId, q).stream()
                .map(this::toPublicDto)
                .toList();
    }

    @Transactional
    public InviteDto createInvite(CreateInviteRequest req) {
        InviteEntity inv = new InviteEntity();
        inv.setId(ids.uid("inv"));
        inv.setPlanId(auth.currentPlanId());
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
        audit.record("create", "invite", loaded.getId(), "Created invite " + loaded.getInviteName());
        return toDto(loaded);
    }

    @Transactional
    public InviteDto updateInvite(String inviteId, UpdateInviteRequest req) {
        InviteEntity inv = invites.findByIdAndPlanId(inviteId, auth.currentPlanId()).orElseThrow();
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
        audit.record("update", "invite", inv.getId(), "Updated invite " + inv.getInviteName());
        return toDto(inv);
    }

    @Transactional
    public void deleteInvite(String inviteId) {
        InviteEntity invite = invites.findByIdAndPlanId(inviteId, auth.currentPlanId()).orElseThrow();
        invites.delete(invite);
        audit.record("delete", "invite", inviteId, "Deleted invite " + invite.getInviteName());
    }

    @Transactional
    public InviteeDto addInvitee(String inviteId, CreateInviteeRequest req) {
        InviteEntity inv = invites.findByIdAndPlanId(inviteId, auth.currentPlanId()).orElseThrow();
        InviteeEntity e = new InviteeEntity();
        e.setId(ids.uid("pers"));
        e.setInvite(inv);
        e.setFullName(req.fullName().trim());
        e.setRsvp(normalizeRsvp(req.rsvp()));
        e.setMealChoice(blankToNull(req.mealChoice()));
        e.setNotes(blankToNull(req.notes()));
        invitees.save(e);
        audit.record("create", "invitee", e.getId(), "Added invitee " + e.getFullName());
        return toDto(e);
    }

    @Transactional
    public InviteeDto updateInvitee(String inviteeId, UpdateInviteeRequest req) {
        InviteeEntity e = invitees.findByIdAndInvite_PlanId(inviteeId, auth.currentPlanId()).orElseThrow();
        if (req.fullName() != null && !req.fullName().trim().isEmpty()) e.setFullName(req.fullName().trim());
        if (req.rsvp() != null) e.setRsvp(normalizeRsvp(req.rsvp()));
        e.setMealChoice(blankToNull(req.mealChoice()));
        e.setNotes(blankToNull(req.notes()));
        invitees.save(e);
        audit.record("update", "invitee", e.getId(), "Updated invitee " + e.getFullName());
        return toDto(e);
    }

    @Transactional
    public InviteeDto patchInviteeRsvp(String inviteeId, String rsvp) {
        InviteeEntity e = invitees.findByIdAndInvite_PlanId(inviteeId, auth.currentPlanId()).orElseThrow();
        e.setRsvp(normalizeRsvp(rsvp));
        invitees.save(e);
        audit.record("update", "invitee_rsvp", e.getId(), "Updated RSVP for " + e.getFullName());
        return toDto(e);
    }

    @Transactional
    public List<InviteeDto> patchInviteRsvp(String inviteId, String rsvp, boolean includeCompanions) {
        return patchInviteRsvpForPlan(auth.currentPlanId(), auth.currentUserId(), inviteId, rsvp, includeCompanions);
    }

    @Transactional
    public List<PublicInviteeDto> publicPatchInviteRsvp(String planId, String actorUserId, String inviteId, String rsvp, boolean includeCompanions) {
        return patchInviteRsvpForPlan(planId, actorUserId, inviteId, rsvp, includeCompanions).stream()
                .map(i -> new PublicInviteeDto(i.id(), i.fullName(), i.rsvp()))
                .toList();
    }

    @Transactional
    public PublicInviteeDto publicPatchInviteeRsvp(String planId, String actorUserId, String inviteeId, String rsvp) {
        InviteeEntity e = invitees.findByIdAndInvite_PlanId(inviteeId, planId).orElseThrow();
        e.setRsvp(normalizeRsvp(rsvp));
        invitees.save(e);
        audit.recordForActor(actorUserId, planId, "update", "public_invitee_rsvp", e.getId(), "Updated RSVP for " + e.getFullName() + " via public RSVP");
        return toPublicDto(e);
    }

    @Transactional
    public void deleteInvitee(String inviteeId) {
        InviteeEntity invitee = invitees.findByIdAndInvite_PlanId(inviteeId, auth.currentPlanId()).orElseThrow();
        invitees.delete(invitee);
        audit.record("delete", "invitee", inviteeId, "Deleted invitee " + invitee.getFullName());
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

    private List<InviteDto> listAllForPlan(String planId) {
        return invites.findAllByPlanId(planId).stream()
                .sorted(Comparator.comparing(InviteEntity::getInviteName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toDto)
                .toList();
    }

    private List<InviteDto> searchByNameForPlan(String planId, String q) {
        return searchInvites(planId, q).stream()
                .map(this::toDto)
                .toList();
    }

    private List<InviteEntity> searchInvites(String planId, String q) {
        if (isBlank(q)) {
            return invites.findAllByPlanId(planId).stream()
                    .sorted(Comparator.comparing(InviteEntity::getInviteName, String.CASE_INSENSITIVE_ORDER))
                    .toList();
        }

        String needle = q.trim().toLowerCase();
        return invites.findAllByPlanId(planId).stream()
                .filter(inv -> matchesInvite(inv, needle) || matchesCompanion(inv, needle))
                .sorted(Comparator.comparing(InviteEntity::getInviteName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<InviteeDto> patchInviteRsvpForPlan(String planId, String actorUserId, String inviteId, String rsvp, boolean includeCompanions) {
        InviteEntity inv = invites.findByIdAndPlanId(inviteId, planId).orElseThrow();
        List<InviteeEntity> companions = invitees.findByInvite_Id(inviteId);
        if (companions.isEmpty()) return List.of();

        String normalized = normalizeRsvp(rsvp);
        if (includeCompanions) {
            for (InviteeEntity c : companions) {
                c.setRsvp(normalized);
                invitees.save(c);
            }
            audit.recordForActor(actorUserId, planId, "update", "invite_rsvp", inviteId, "Patched RSVP for invite " + inv.getInviteName());
            return companions.stream()
                    .sorted(Comparator.comparing(InviteeEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                    .map(this::toDto)
                    .toList();
        }

        // "one invite" = primary person for this invite. Prefer exact name match with inviteName.
        InviteeEntity primary = companions.stream()
                .filter(c -> safeEq(c.getFullName(), inv.getInviteName()))
                .findFirst()
                .orElse(companions.getFirst());

        primary.setRsvp(normalized);
        invitees.save(primary);
        audit.recordForActor(actorUserId, planId, "update", "invite_rsvp", inviteId, "Patched RSVP for invite " + inv.getInviteName());
        return List.of(toDto(primary));
    }

    private PublicInviteDto toPublicDto(InviteEntity inv) {
        List<PublicInviteeDto> people = (inv.getInvitees() == null ? List.<InviteeEntity>of() : inv.getInvitees())
                .stream()
                .sorted(Comparator.comparing(InviteeEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toPublicDto)
                .toList();
        return new PublicInviteDto(inv.getId(), inv.getInviteName(), people);
    }

    private PublicInviteeDto toPublicDto(InviteeEntity e) {
        return new PublicInviteeDto(e.getId(), e.getFullName(), e.getRsvp());
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

    private static boolean matchesInvite(InviteEntity inv, String needle) {
        return containsIgnoreCase(inv.getInviteName(), needle);
    }

    private static boolean matchesCompanion(InviteEntity inv, String needle) {
        if (inv.getInvitees() == null || inv.getInvitees().isEmpty()) return false;
        return inv.getInvitees().stream().anyMatch(c -> containsIgnoreCase(c.getFullName(), needle));
    }

    private static boolean containsIgnoreCase(String value, String needle) {
        if (value == null || needle == null) return false;
        return value.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private static boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }
    private static String blankToNull(String s) { return isBlank(s) ? null : s.trim(); }
    private static boolean safeEq(String a, String b) {
        if (a == null || b == null) return false;
        return a.trim().equalsIgnoreCase(b.trim());
    }
}
