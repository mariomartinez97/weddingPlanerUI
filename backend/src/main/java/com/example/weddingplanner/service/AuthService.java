package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.AccessiblePlanDto;
import com.example.weddingplanner.api.dto.AuthSessionDto;
import com.example.weddingplanner.api.dto.AuthUserDto;
import com.example.weddingplanner.api.dto.LoginRequest;
import com.example.weddingplanner.api.dto.SignupRequest;
import com.example.weddingplanner.config.AuthPrincipal;
import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.AuthSessionEntity;
import com.example.weddingplanner.persistence.entity.PlanAccessRole;
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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final UserPlanAccessRepository accessRepo;
    private final PlanRepository plans;
    private final AuthSessionRepository sessions;
    private final IdService ids;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public AuthService(
            AppUserRepository users,
            UserPlanAccessRepository accessRepo,
            PlanRepository plans,
            AuthSessionRepository sessions,
            IdService ids
    ) {
        this.users = users;
        this.accessRepo = accessRepo;
        this.plans = plans;
        this.sessions = sessions;
        this.ids = ids;
    }

    @Transactional
    public AuthSessionDto login(LoginRequest req) {
        if (req == null || isBlank(req.email()) || isBlank(req.password())) {
            throw new ResponseStatusException(BAD_REQUEST, "Email and password are required");
        }

        AppUserEntity user = users.findByEmailIgnoreCase(req.email().trim()).orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));
        if (!passwords.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid credentials");
        }

        AuthSessionEntity session = createSession(user.getId());

        return new AuthSessionDto(session.getToken(), toUserDto(user), accessiblePlans(user.getId()));
    }

    @Transactional
    public AuthSessionDto signup(SignupRequest req) {
        if (req == null || isBlank(req.fullName()) || isBlank(req.email()) || isBlank(req.password()) || isBlank(req.tier()) || isBlank(req.eventType())) {
            throw new ResponseStatusException(BAD_REQUEST, "Full name, email, password, tier and event type are required");
        }
        String tier = req.tier().trim();
        if (!List.of("Free", "Individual", "Pro").contains(tier)) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid tier");
        }

        users.findByEmailIgnoreCase(req.email().trim()).ifPresent(u -> {
            throw new ResponseStatusException(BAD_REQUEST, "Email already exists");
        });

        AppUserEntity user = new AppUserEntity();
        user.setId(ids.uid("usr"));
        user.setEmail(req.email().trim().toLowerCase());
        user.setDisplayName(req.fullName().trim());
        user.setPasswordHash(passwords.encode(req.password()));
        user.setAdmin(false);
        users.save(user);

        PlanEntity plan = new PlanEntity();
        plan.setId(ids.uid("plan"));
        plan.setName(subscriptionName(req));
        plan.setStatus(PlanStatus.ACTIVE);
        plans.save(plan);

        UserPlanAccessEntity access = new UserPlanAccessEntity();
        access.setId(ids.uid("acc"));
        access.setUserId(user.getId());
        access.setPlanId(plan.getId());
        access.setAccessRole(PlanAccessRole.SUBSCRIPTION_ADMIN);
        accessRepo.save(access);

        AuthSessionEntity session = createSession(user.getId());
        return new AuthSessionDto(session.getToken(), toUserDto(user), accessiblePlans(user.getId()));
    }

    public AuthSessionDto me(String token) {
        AppUserEntity user = resolveUserByToken(token);
        return new AuthSessionDto(token, toUserDto(user), accessiblePlans(user.getId()));
    }

    @Transactional
    public void logout(String token) {
        if (!isBlank(token)) sessions.deleteByToken(token);
    }

    public AuthPrincipal authenticate(String token, String planId, boolean requiresPlan) {
        AppUserEntity user = resolveUserByToken(token);
        String resolvedPlanId = null;

        if (requiresPlan) {
            if (isBlank(planId)) throw new ResponseStatusException(UNAUTHORIZED, "Missing plan header");
            resolvedPlanId = planId.trim();
            if (!plans.existsByIdAndStatus(resolvedPlanId, PlanStatus.ACTIVE)) {
                throw new ResponseStatusException(UNAUTHORIZED, "Plan access denied");
            }
            if (!user.isAdmin() && !accessRepo.existsByUserIdAndPlanId(user.getId(), resolvedPlanId)) {
                throw new ResponseStatusException(UNAUTHORIZED, "Plan access denied");
            }
        }

        return new AuthPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), resolvedPlanId, user.isAdmin());
    }

    private AppUserEntity resolveUserByToken(String token) {
        if (isBlank(token)) throw new ResponseStatusException(UNAUTHORIZED, "Missing auth token");
        AuthSessionEntity session = sessions.findByToken(token.trim()).orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid auth token"));
        if (session.getExpiresAt() == null || session.getExpiresAt().isBefore(OffsetDateTime.now())) {
            sessions.deleteById(session.getId());
            throw new ResponseStatusException(UNAUTHORIZED, "Session expired");
        }
        return users.findById(session.getUserId()).orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid auth token"));
    }

    private List<AccessiblePlanDto> accessiblePlans(String userId) {
        List<UserPlanAccessEntity> accessRows = accessRepo.findAllByUserId(userId);
        List<String> planIds = accessRows.stream().map(UserPlanAccessEntity::getPlanId).toList();
        Map<String, UserPlanAccessEntity> accessByPlanId = accessRows.stream()
                .collect(Collectors.toMap(UserPlanAccessEntity::getPlanId, Function.identity(), (left, right) -> left));
        return plans.findAllByIdInAndStatusOrderByNameAsc(planIds, PlanStatus.ACTIVE).stream()
                .map(plan -> toPlanDto(plan, accessByPlanId.get(plan.getId())))
                .toList();
    }

    private AuthUserDto toUserDto(AppUserEntity user) {
        return new AuthUserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.isAdmin(), user.isAdmin());
    }

    private AccessiblePlanDto toPlanDto(PlanEntity plan, UserPlanAccessEntity access) {
        PlanAccessRole role = access != null && access.getAccessRole() != null ? access.getAccessRole() : PlanAccessRole.MEMBER;
        return new AccessiblePlanDto(plan.getId(), plan.getName(), role.name());
    }

    private AuthSessionEntity createSession(String userId) {
        sessions.deleteByExpiresAtBefore(OffsetDateTime.now());

        AuthSessionEntity session = new AuthSessionEntity();
        session.setId(ids.uid("sess"));
        session.setUserId(userId);
        session.setToken(UUID.randomUUID().toString());
        session.setExpiresAt(OffsetDateTime.now().plusDays(30));
        return sessions.save(session);
    }

    private String subscriptionName(SignupRequest req) {
        if (!isBlank(req.subscriptionName())) return req.subscriptionName().trim();
        return req.fullName().trim() + " " + req.eventType().trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
