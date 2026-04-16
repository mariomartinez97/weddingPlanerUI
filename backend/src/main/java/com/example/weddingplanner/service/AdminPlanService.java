package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.AdminPlanDto;
import com.example.weddingplanner.api.dto.CreatePlanRequest;
import com.example.weddingplanner.api.dto.UpdatePlanRequest;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class AdminPlanService {

    private final PlanRepository plans;
    private final AppUserRepository users;
    private final UserPlanAccessRepository accessRepo;
    private final IdService ids;
    private final AuthContextService auth;
    private final AuditService audit;
    private final int archiveRetentionDays;

    public AdminPlanService(
            PlanRepository plans,
            AppUserRepository users,
            UserPlanAccessRepository accessRepo,
            IdService ids,
            AuthContextService auth,
            AuditService audit,
            @Value("${app.plan-archive-retention-days:90}") int archiveRetentionDays
    ) {
        this.plans = plans;
        this.users = users;
        this.accessRepo = accessRepo;
        this.ids = ids;
        this.auth = auth;
        this.audit = audit;
        this.archiveRetentionDays = archiveRetentionDays;
    }

    public List<AdminPlanDto> listPlans(boolean includeInactive) {
        requireAdmin();
        List<PlanEntity> rows = includeInactive
                ? plans.findAllByOrderByNameAsc()
                : plans.findAllByStatusOrderByNameAsc(PlanStatus.ACTIVE);
        return mapPlans(rows);
    }

    public AdminPlanDto getPlan(String planId) {
        requireAdmin();
        PlanEntity plan = plans.findById(planId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Plan not found"));
        return toDto(plan, assignedUserIdsByPlanId(List.of(plan.getId())).getOrDefault(plan.getId(), List.of()));
    }

    @Transactional
    public AdminPlanDto createPlan(CreatePlanRequest req) {
        requireAdmin();
        if (req == null || isBlank(req.name())) {
            throw new ResponseStatusException(BAD_REQUEST, "Plan name is required");
        }

        List<String> assignedUserIds = normalizedUserIds(req.assignedUserIds());
        if (!assignedUserIds.contains(auth.currentUserId())) {
            assignedUserIds = new ArrayList<>(assignedUserIds);
            assignedUserIds.add(auth.currentUserId());
        }
        validateUsers(assignedUserIds);

        PlanEntity plan = new PlanEntity();
        plan.setId(ids.uid("plan"));
        plan.setName(req.name().trim());
        plan.setStatus(PlanStatus.ACTIVE);
        applyStatus(plan, PlanStatus.ACTIVE);
        plans.save(plan);

        replaceAssignedUsers(plan.getId(), assignedUserIds);
        audit.recordForPlan(plan.getId(), "create", "plan", plan.getId(), "Created plan " + plan.getName());
        return toDto(plan, assignedUserIds);
    }

    @Transactional
    public AdminPlanDto updatePlan(String planId, UpdatePlanRequest req) {
        requireAdmin();
        if (req == null || isBlank(req.name())) {
            throw new ResponseStatusException(BAD_REQUEST, "Plan name is required");
        }

        PlanEntity plan = plans.findById(planId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Plan not found"));
        List<String> assignedUserIds = normalizedUserIds(req.assignedUserIds());
        validateUsers(assignedUserIds);

        PlanStatus status = parseStatus(req.status());
        plan.setName(req.name().trim());
        applyStatus(plan, status);
        plans.save(plan);

        replaceAssignedUsers(plan.getId(), assignedUserIds);
        audit.recordForPlan(plan.getId(), "update", "plan", plan.getId(), "Updated plan " + plan.getName() + " to " + plan.getStatus().name());
        return toDto(plan, assignedUserIds);
    }

    private List<AdminPlanDto> mapPlans(List<PlanEntity> rows) {
        Map<String, List<String>> assignedByPlan = assignedUserIdsByPlanId(rows.stream().map(PlanEntity::getId).toList());
        return rows.stream()
                .map(plan -> toDto(plan, assignedByPlan.getOrDefault(plan.getId(), List.of())))
                .toList();
    }

    private Map<String, List<String>> assignedUserIdsByPlanId(List<String> planIds) {
        if (planIds.isEmpty()) return Map.of();

        Map<String, List<String>> assignedByPlan = accessRepo.findAllByPlanIdIn(planIds).stream()
                .collect(Collectors.groupingBy(
                        UserPlanAccessEntity::getPlanId,
                        Collectors.mapping(UserPlanAccessEntity::getUserId, Collectors.toList())
                ));

        Map<String, List<String>> sorted = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : assignedByPlan.entrySet()) {
            sorted.put(entry.getKey(), entry.getValue().stream().distinct().sorted().toList());
        }
        return sorted;
    }

    private void replaceAssignedUsers(String planId, List<String> userIds) {
        List<UserPlanAccessEntity> current = accessRepo.findAllByPlanId(planId);
        Set<String> desired = new HashSet<>(userIds);
        Map<String, UserPlanAccessEntity> currentByUserId = current.stream()
                .collect(Collectors.toMap(UserPlanAccessEntity::getUserId, access -> access, (left, right) -> left));

        List<UserPlanAccessEntity> toDelete = current.stream()
                .filter(access -> !desired.contains(access.getUserId()))
                .toList();
        if (!toDelete.isEmpty()) {
            accessRepo.deleteAll(toDelete);
        }

        for (String userId : desired) {
            if (currentByUserId.containsKey(userId)) continue;
            UserPlanAccessEntity access = new UserPlanAccessEntity();
            access.setId(ids.uid("acc"));
            access.setUserId(userId);
            access.setPlanId(planId);
            accessRepo.save(access);
        }
    }

    private void validateUsers(List<String> userIds) {
        if (userIds.isEmpty()) return;
        Set<String> requested = new HashSet<>(userIds);
        Set<String> existing = users.findAllById(requested).stream().map(user -> user.getId()).collect(Collectors.toSet());
        if (!existing.containsAll(requested)) {
            throw new ResponseStatusException(BAD_REQUEST, "One or more users do not exist");
        }
    }

    private void applyStatus(PlanEntity plan, PlanStatus status) {
        OffsetDateTime now = OffsetDateTime.now();
        plan.setStatus(status);

        switch (status) {
            case ACTIVE -> {
                plan.setDeactivatedAt(null);
                plan.setArchivedAt(null);
                plan.setPurgeAfter(null);
            }
            case INACTIVE -> {
                plan.setDeactivatedAt(now);
                plan.setArchivedAt(null);
                plan.setPurgeAfter(null);
            }
            case ARCHIVED -> {
                plan.setDeactivatedAt(null);
                plan.setArchivedAt(now);
                plan.setPurgeAfter(now.plusDays(archiveRetentionDays));
            }
        }
    }

    private AdminPlanDto toDto(PlanEntity plan, List<String> assignedUserIds) {
        return new AdminPlanDto(
                plan.getId(),
                plan.getName(),
                plan.getStatus() != null ? plan.getStatus().name() : null,
                toString(plan.getCreatedAt()),
                toString(plan.getUpdatedAt()),
                toString(plan.getDeactivatedAt()),
                toString(plan.getArchivedAt()),
                toString(plan.getPurgeAfter()),
                assignedUserIds,
                assignedUserIds.size()
        );
    }

    private PlanStatus parseStatus(String raw) {
        if (isBlank(raw)) {
            throw new ResponseStatusException(BAD_REQUEST, "Plan status is required");
        }

        try {
            return PlanStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid plan status");
        }
    }

    private List<String> normalizedUserIds(List<String> userIds) {
        if (userIds == null) return List.of();
        return userIds.stream()
                .filter(AdminPlanService::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private void requireAdmin() {
        if (!auth.isAdmin()) throw new ResponseStatusException(FORBIDDEN, "Admin access required");
    }

    private static String toString(OffsetDateTime value) {
        return value != null ? value.toString() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static boolean isBlank(String value) {
        return !hasText(value);
    }
}
