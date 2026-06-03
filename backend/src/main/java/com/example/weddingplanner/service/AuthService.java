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
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final UserPlanAccessRepository accessRepo;
    private final PlanRepository plans;
    private final AuthSessionRepository sessions;
    private final IdService ids;
    private final GoogleAuthService googleAuth;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public AuthService(
            AppUserRepository users,
            UserPlanAccessRepository accessRepo,
            PlanRepository plans,
            AuthSessionRepository sessions,
            IdService ids,
            GoogleAuthService googleAuth
    ) {
        this.users = users;
        this.accessRepo = accessRepo;
        this.plans = plans;
        this.sessions = sessions;
        this.ids = ids;
        this.googleAuth = googleAuth;
    }

    @Transactional
    public AuthSessionDto login(LoginRequest req) {
        if (req == null || isBlank(req.email()) || isBlank(req.password())) {
            throw new ResponseStatusException(BAD_REQUEST, "Email and password are required");
        }

        AppUserEntity user = users.findByEmailIgnoreCase(req.email().trim()).orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid credentials"));
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "This account uses Google sign-in. Please log in with Google.");
        }
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

    @Transactional
    public AuthSessionDto loginWithGoogle(String idToken) {
        GoogleAuthService.GoogleUserInfo info = googleAuth.verifyIdToken(idToken);

        AppUserEntity user = users.findByEmailIgnoreCase(info.email()).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(NOT_FOUND, "No account found for this email");
        }

        linkGoogleToUser(user, info);

        AuthSessionEntity session = createSession(user.getId());
        return new AuthSessionDto(session.getToken(), toUserDto(user), accessiblePlans(user.getId()));
    }

    @Transactional
    public AuthSessionDto signupWithGoogle(String idToken) {
        GoogleAuthService.GoogleUserInfo info = googleAuth.verifyIdToken(idToken);

        AppUserEntity existing = users.findByEmailIgnoreCase(info.email()).orElse(null);
        if (existing != null) {
            linkGoogleToUser(existing, info);
            AuthSessionEntity session = createSession(existing.getId());
            return new AuthSessionDto(session.getToken(), toUserDto(existing), accessiblePlans(existing.getId()));
        }

        // Create new user
        AppUserEntity user = new AppUserEntity();
        user.setId(ids.uid("usr"));
        user.setEmail(info.email().trim().toLowerCase());
        user.setDisplayName(info.displayName() != null ? info.displayName() : info.email());
        user.setPasswordHash(null);
        user.setGoogleId(info.googleId());
        user.setAvatarUrl(info.pictureUrl());
        user.setAuthProvider("google");
        user.setAdmin(false);
        users.save(user);

        // Create default plan
        PlanEntity plan = new PlanEntity();
        plan.setId(ids.uid("plan"));
        plan.setName(user.getDisplayName() + " Plan");
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

    @Transactional
    public AuthUserDto linkGoogleAccount(String userId, String idToken) {
        GoogleAuthService.GoogleUserInfo info = googleAuth.verifyIdToken(idToken);

        AppUserEntity user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "User not found"));

        linkGoogleToUser(user, info);

        return toUserDto(user);
    }

    private void linkGoogleToUser(AppUserEntity user, GoogleAuthService.GoogleUserInfo info) {
        if (user.getGoogleId() != null && user.getGoogleId().equals(info.googleId())) {
            return; // already linked to same account
        }
        if (user.getGoogleId() != null && !user.getGoogleId().equals(info.googleId())) {
            throw new ResponseStatusException(CONFLICT, "Email already associated with another Google account");
        }

        // Check if this Google ID is already linked to a different user
        users.findByGoogleId(info.googleId()).ifPresent(other -> {
            if (!other.getId().equals(user.getId())) {
                throw new ResponseStatusException(CONFLICT, "This Google account is linked to another user");
            }
        });

        user.setGoogleId(info.googleId());
        if (info.pictureUrl() != null) {
            user.setAvatarUrl(info.pictureUrl());
        }
        user.setAuthProvider(user.getPasswordHash() != null && !user.getPasswordHash().isBlank() ? "both" : "google");
        users.save(user);
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
        String provider = resolveAuthProvider(user);
        return new AuthUserDto(user.getId(), user.getEmail(), user.getDisplayName(),
                user.isAdmin(), user.isAdmin(), provider, user.getAvatarUrl());
    }

    private String resolveAuthProvider(AppUserEntity user) {
        boolean hasPassword = user.getPasswordHash() != null && !user.getPasswordHash().isBlank();
        boolean hasGoogle = user.getGoogleId() != null && !user.getGoogleId().isBlank();
        if (hasPassword && hasGoogle) return "both";
        if (hasGoogle) return "google";
        return "email";
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
