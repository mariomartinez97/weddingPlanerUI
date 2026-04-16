package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.AdminUserDto;
import com.example.weddingplanner.api.dto.CreateAdminUserRequest;
import com.example.weddingplanner.api.dto.ResetUserPasswordRequest;
import com.example.weddingplanner.api.dto.UpdateUserAccessRequest;
import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.AuthSessionRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class AdminService {

    private final AppUserRepository users;
    private final PlanRepository plans;
    private final UserPlanAccessRepository accessRepo;
    private final AuthSessionRepository sessions;
    private final IdService ids;
    private final AuthContextService auth;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public AdminService(AppUserRepository users, PlanRepository plans, UserPlanAccessRepository accessRepo, AuthSessionRepository sessions, IdService ids, AuthContextService auth) {
        this.users = users;
        this.plans = plans;
        this.accessRepo = accessRepo;
        this.sessions = sessions;
        this.ids = ids;
        this.auth = auth;
    }

    public List<AdminUserDto> listUsers() {
        requireAdmin();
        Map<String, List<String>> planIdsByUser = accessRepo.findAll().stream()
                .collect(Collectors.groupingBy(UserPlanAccessEntity::getUserId, Collectors.mapping(UserPlanAccessEntity::getPlanId, Collectors.toList())));

        return users.findAll().stream()
                .map(u -> new AdminUserDto(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        u.isAdmin(),
                        planIdsByUser.getOrDefault(u.getId(), List.of())
                ))
                .sorted(java.util.Comparator.comparing(AdminUserDto::email, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public AdminUserDto createUser(CreateAdminUserRequest req) {
        requireAdmin();
        if (req == null || isBlank(req.email()) || isBlank(req.displayName()) || isBlank(req.password())) {
          throw new ResponseStatusException(BAD_REQUEST, "Email, display name and password are required");
        }
        users.findByEmailIgnoreCase(req.email().trim()).ifPresent(u -> {
            throw new ResponseStatusException(BAD_REQUEST, "Email already exists");
        });

        List<String> planIds = normalizedPlanIds(req.planIds());
        validatePlans(planIds);

        AppUserEntity user = new AppUserEntity();
        user.setId(ids.uid("usr"));
        user.setEmail(req.email().trim().toLowerCase());
        user.setDisplayName(req.displayName().trim());
        user.setPasswordHash(passwords.encode(req.password()));
        user.setAdmin(Boolean.TRUE.equals(req.isAdmin()));
        users.save(user);

        replaceAccess(user.getId(), planIds);
        return toDto(user, planIds);
    }

    @Transactional
    public AdminUserDto updateUserAccess(String userId, UpdateUserAccessRequest req) {
        requireAdmin();
        AppUserEntity user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        List<String> planIds = normalizedPlanIds(req.planIds());
        validatePlans(planIds);

        if (req.isAdmin() != null) {
            user.setAdmin(req.isAdmin());
            users.save(user);
        }

        replaceAccess(user.getId(), planIds);
        return toDto(user, planIds);
    }

    @Transactional
    public void resetPassword(String userId, ResetUserPasswordRequest req) {
        requireAdmin();
        if (req == null || isBlank(req.password())) {
            throw new ResponseStatusException(BAD_REQUEST, "Password is required");
        }
        AppUserEntity user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        user.setPasswordHash(passwords.encode(req.password()));
        users.save(user);
        sessions.deleteAllByUserId(userId);
    }

    @Transactional
    public void deleteUser(String userId) {
        requireAdmin();
        if (auth.currentUserId().equals(userId)) {
            throw new ResponseStatusException(BAD_REQUEST, "You cannot delete your own user");
        }
        AppUserEntity user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        sessions.deleteAllByUserId(userId);
        accessRepo.deleteAll(accessRepo.findAllByUserId(userId));
        users.delete(user);
    }

    private void replaceAccess(String userId, List<String> planIds) {
        List<UserPlanAccessEntity> current = accessRepo.findAllByUserId(userId);
        if (!current.isEmpty()) accessRepo.deleteAll(current);
        for (String planId : planIds) {
            UserPlanAccessEntity access = new UserPlanAccessEntity();
            access.setId(ids.uid("acc"));
            access.setUserId(userId);
            access.setPlanId(planId);
            accessRepo.save(access);
        }
    }

    private AdminUserDto toDto(AppUserEntity user, List<String> planIds) {
        return new AdminUserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.isAdmin(), planIds);
    }

    private void validatePlans(List<String> planIds) {
        if (planIds.isEmpty()) return;
        Set<String> requested = new HashSet<>(planIds);
        Set<String> existing = plans.findAllByIdInAndStatusOrderByNameAsc(requested, PlanStatus.ACTIVE).stream()
                .map(PlanEntity::getId)
                .collect(Collectors.toSet());
        if (!existing.containsAll(requested)) {
            throw new ResponseStatusException(BAD_REQUEST, "One or more plans do not exist or are not active");
        }
    }

    private List<String> normalizedPlanIds(List<String> ids) {
        if (ids == null) return List.of();
        return ids.stream().filter(v -> v != null && !v.trim().isEmpty()).map(String::trim).distinct().toList();
    }

    private void requireAdmin() {
        if (!auth.isAdmin()) throw new ResponseStatusException(FORBIDDEN, "Admin access required");
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
