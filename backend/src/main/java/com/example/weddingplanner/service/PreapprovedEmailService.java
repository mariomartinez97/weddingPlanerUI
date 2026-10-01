package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.PreapprovedEmailDto;
import com.example.weddingplanner.persistence.entity.PlanAccessRole;
import com.example.weddingplanner.persistence.entity.PreapprovedEmailEntity;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.PreapprovedEmailRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class PreapprovedEmailService {

    private final PreapprovedEmailRepository preapprovedRepo;
    private final AppUserRepository users;
    private final UserPlanAccessRepository accessRepo;
    private final IdService ids;

    public PreapprovedEmailService(
            PreapprovedEmailRepository preapprovedRepo,
            AppUserRepository users,
            UserPlanAccessRepository accessRepo,
            IdService ids
    ) {
        this.preapprovedRepo = preapprovedRepo;
        this.users = users;
        this.accessRepo = accessRepo;
        this.ids = ids;
    }

    @Transactional
    public PreapprovedEmailDto addPreapprovedEmail(String planId, String email, String roleStr, String createdBy) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is required");
        }
        String normalizedEmail = email.trim().toLowerCase();
        PlanAccessRole role = parseRole(roleStr);

        if (preapprovedRepo.existsByEmailIgnoreCaseAndPlanId(normalizedEmail, planId)) {
            throw new ResponseStatusException(CONFLICT, "Email already pre-approved for this plan");
        }

        // Check if user already exists and has access
        var existingUser = users.findByEmailIgnoreCase(normalizedEmail).orElse(null);
        if (existingUser != null && accessRepo.existsByUserIdAndPlanId(existingUser.getId(), planId)) {
            throw new ResponseStatusException(CONFLICT, "User already has access to this plan");
        }

        // If user exists but has no access → grant immediately
        if (existingUser != null) {
            UserPlanAccessEntity access = new UserPlanAccessEntity();
            access.setId(ids.uid("acc"));
            access.setUserId(existingUser.getId());
            access.setPlanId(planId);
            access.setAccessRole(role);
            accessRepo.save(access);

            PreapprovedEmailEntity entry = createEntry(normalizedEmail, planId, role, createdBy);
            entry.setClaimed(true);
            entry.setClaimedAt(OffsetDateTime.now());
            preapprovedRepo.save(entry);

            return new PreapprovedEmailDto(entry.getId(), normalizedEmail, planId, role.name(), "granted_immediately");
        }

        // User not registered yet — save for later claim
        PreapprovedEmailEntity entry = createEntry(normalizedEmail, planId, role, createdBy);
        preapprovedRepo.save(entry);

        return new PreapprovedEmailDto(entry.getId(), normalizedEmail, planId, role.name(), "waiting_for_registration");
    }

    public List<PreapprovedEmailDto> listPreapprovedEmails(String planId) {
        return preapprovedRepo.findAllByPlanId(planId).stream()
                .map(e -> new PreapprovedEmailDto(
                        e.getId(), e.getEmail(), e.getPlanId(), e.getRole().name(),
                        e.isClaimed() ? "granted" : "waiting_for_registration"
                ))
                .toList();
    }

    @Transactional
    public void removePreapprovedEmail(String id, String planId) {
        PreapprovedEmailEntity entry = preapprovedRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Pre-approved email not found"));
        if (!entry.getPlanId().equals(planId)) {
            throw new ResponseStatusException(NOT_FOUND, "Pre-approved email not found");
        }
        if (entry.isClaimed()) {
            throw new ResponseStatusException(BAD_REQUEST, "Cannot remove a claimed pre-approval");
        }
        preapprovedRepo.delete(entry);
    }

    /**
     * Called during signup/login to auto-grant access for all unclaimed pre-approvals matching this email.
     */
    @Transactional
    public void claimPreapprovals(String email, String userId) {
        List<PreapprovedEmailEntity> matches = preapprovedRepo.findAllByEmailIgnoreCaseAndClaimedFalse(email);
        for (PreapprovedEmailEntity match : matches) {
            if (!accessRepo.existsByUserIdAndPlanId(userId, match.getPlanId())) {
                UserPlanAccessEntity access = new UserPlanAccessEntity();
                access.setId(ids.uid("acc"));
                access.setUserId(userId);
                access.setPlanId(match.getPlanId());
                access.setAccessRole(match.getRole());
                accessRepo.save(access);
            }
            match.setClaimed(true);
            match.setClaimedAt(OffsetDateTime.now());
            preapprovedRepo.save(match);
        }
    }

    private PreapprovedEmailEntity createEntry(String email, String planId, PlanAccessRole role, String createdBy) {
        PreapprovedEmailEntity entry = new PreapprovedEmailEntity();
        entry.setId(ids.uid("preap"));
        entry.setEmail(email);
        entry.setPlanId(planId);
        entry.setRole(role);
        entry.setCreatedBy(createdBy);
        return entry;
    }

    private PlanAccessRole parseRole(String roleStr) {
        if (roleStr == null || roleStr.trim().isEmpty() || "MEMBER".equalsIgnoreCase(roleStr.trim())) {
            return PlanAccessRole.MEMBER;
        }
        if ("SUBSCRIPTION_ADMIN".equalsIgnoreCase(roleStr.trim())) {
            return PlanAccessRole.SUBSCRIPTION_ADMIN;
        }
        throw new ResponseStatusException(BAD_REQUEST, "Invalid role: " + roleStr);
    }
}
