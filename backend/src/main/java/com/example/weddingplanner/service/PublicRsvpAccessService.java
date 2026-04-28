package com.example.weddingplanner.service;

import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class PublicRsvpAccessService {

    private final PlanRepository plans;
    private final AppUserRepository users;
    private final IdService ids;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @Value("${app.public-rsvp.token:}")
    private String publicToken;

    @Value("${app.public-rsvp.actor-email:public-rsvp@system.local}")
    private String actorEmail;

    @Value("${app.public-rsvp.actor-display-name:Public RSVP}")
    private String actorDisplayName;

    public PublicRsvpAccessService(PlanRepository plans, AppUserRepository users, IdService ids) {
        this.plans = plans;
        this.users = users;
        this.ids = ids;
    }

    public void authorize(String token, String planId) {
        if (isBlank(publicToken)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Public RSVP is not enabled");
        }
        if (isBlank(token) || !publicToken.equals(token.trim())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid public RSVP token");
        }
        if (isBlank(planId) || !plans.existsByIdAndStatus(planId.trim(), PlanStatus.ACTIVE)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Plan access denied");
        }
    }

    public String actorUserId() {
        return users.findByEmailIgnoreCase(actorEmail)
                .orElseGet(this::createActorUser)
                .getId();
    }

    private AppUserEntity createActorUser() {
        AppUserEntity user = new AppUserEntity();
        user.setId(ids.uid("usr"));
        user.setEmail(actorEmail.trim().toLowerCase());
        user.setDisplayName(actorDisplayName.trim());
        user.setPasswordHash(passwords.encode(UUID.randomUUID().toString()));
        user.setAdmin(false);
        return users.save(user);
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
