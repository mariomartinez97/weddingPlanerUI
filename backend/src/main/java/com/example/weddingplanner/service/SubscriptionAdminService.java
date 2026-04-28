package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.AdminUserDto;
import com.example.weddingplanner.api.dto.CreateAdminUserRequest;
import com.example.weddingplanner.api.dto.UpdateUserAccessRequest;
import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.PlanAccessRole;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class SubscriptionAdminService {

    private final AppUserRepository users;
    private final UserPlanAccessRepository accessRepo;
    private final IdService ids;
    private final AuthContextService auth;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public SubscriptionAdminService(AppUserRepository users, UserPlanAccessRepository accessRepo, IdService ids, AuthContextService auth) {
        this.users = users;
        this.accessRepo = accessRepo;
        this.ids = ids;
        this.auth = auth;
    }

    public List<AdminUserDto> listUsers() {
        requireSubscriptionAdmin();
        String planId = auth.currentPlanId();
        return accessRepo.findAllByPlanId(planId).stream()
                .map(access -> users.findById(access.getUserId()).map(user -> toDto(user, access)).orElse(null))
                .filter(user -> user != null)
                .sorted(Comparator.comparing(AdminUserDto::email, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public AdminUserDto createUser(CreateAdminUserRequest req) {
        requireSubscriptionAdmin();
        if (req == null || isBlank(req.email())) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is required");
        }

        String planId = auth.currentPlanId();
        AppUserEntity user = users.findByEmailIgnoreCase(req.email().trim()).orElse(null);
        if (user == null) {
            if (isBlank(req.displayName()) || isBlank(req.password())) {
                throw new ResponseStatusException(BAD_REQUEST, "Display name and password are required for new users");
            }
            user = new AppUserEntity();
            user.setId(ids.uid("usr"));
            user.setEmail(req.email().trim().toLowerCase());
            user.setDisplayName(req.displayName().trim());
            user.setPasswordHash(passwords.encode(req.password()));
            user.setAdmin(false);
            users.save(user);
        }

        String userId = user.getId();
        UserPlanAccessEntity access = accessRepo.findAllByUserId(userId).stream()
                .filter(row -> planId.equals(row.getPlanId()))
                .findFirst()
                .orElseGet(() -> {
                    UserPlanAccessEntity row = new UserPlanAccessEntity();
                    row.setId(ids.uid("acc"));
                    row.setUserId(userId);
                    row.setPlanId(planId);
                    return row;
                });
        access.setAccessRole(requestedRole(req.subscriptionAdminPlanIds(), planId));
        accessRepo.save(access);
        return toDto(user, access);
    }

    @Transactional
    public AdminUserDto updateUserAccess(String userId, UpdateUserAccessRequest req) {
        requireSubscriptionAdmin();
        if (req != null && Boolean.TRUE.equals(req.isAdmin())) {
            throw new ResponseStatusException(FORBIDDEN, "Subscription admins cannot grant full admin access");
        }

        AppUserEntity user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        String planId = auth.currentPlanId();
        UserPlanAccessEntity access = accessRepo.findAllByUserId(userId).stream()
                .filter(row -> planId.equals(row.getPlanId()))
                .findFirst()
                .orElseGet(() -> {
                    UserPlanAccessEntity row = new UserPlanAccessEntity();
                    row.setId(ids.uid("acc"));
                    row.setUserId(userId);
                    row.setPlanId(planId);
                    return row;
                });

        access.setAccessRole(requestedRole(req != null ? req.subscriptionAdminPlanIds() : null, planId));
        accessRepo.save(access);
        return toDto(user, access);
    }

    @Transactional
    public void deleteUserAccess(String userId) {
        requireSubscriptionAdmin();
        if (auth.currentUserId().equals(userId)) {
            throw new ResponseStatusException(BAD_REQUEST, "You cannot remove your own subscription access");
        }
        String planId = auth.currentPlanId();
        UserPlanAccessEntity access = accessRepo.findAllByUserId(userId).stream()
                .filter(row -> planId.equals(row.getPlanId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User access not found"));
        accessRepo.delete(access);
    }

    private void requireSubscriptionAdmin() {
        if (auth.isAdmin()) return;
        if (!accessRepo.existsByUserIdAndPlanIdAndAccessRole(auth.currentUserId(), auth.currentPlanId(), PlanAccessRole.SUBSCRIPTION_ADMIN)) {
            throw new ResponseStatusException(FORBIDDEN, "Subscription admin access required");
        }
    }

    private AdminUserDto toDto(AppUserEntity user, UserPlanAccessEntity access) {
        List<String> planIds = List.of(access.getPlanId());
        List<String> subscriptionAdminPlanIds = access.getAccessRole() == PlanAccessRole.SUBSCRIPTION_ADMIN ? planIds : List.of();
        return new AdminUserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.isAdmin(), planIds, subscriptionAdminPlanIds);
    }

    private PlanAccessRole requestedRole(List<String> subscriptionAdminPlanIds, String planId) {
        if (subscriptionAdminPlanIds == null) return PlanAccessRole.MEMBER;
        return subscriptionAdminPlanIds.stream().anyMatch(planId::equals) ? PlanAccessRole.SUBSCRIPTION_ADMIN : PlanAccessRole.MEMBER;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
