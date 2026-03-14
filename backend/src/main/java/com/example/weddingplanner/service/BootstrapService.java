package com.example.weddingplanner.service;

import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapService implements CommandLineRunner {

    private final PlanRepository plans;
    private final AppUserRepository users;
    private final UserPlanAccessRepository accessRepo;
    private final IdService ids;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @Value("${app.bootstrap.admin-email:admin@example.com}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:admin1234}")
    private String adminPassword;

    public BootstrapService(PlanRepository plans, AppUserRepository users, UserPlanAccessRepository accessRepo, IdService ids) {
        this.plans = plans;
        this.users = users;
        this.accessRepo = accessRepo;
        this.ids = ids;
    }

    @Override
    public void run(String... args) {
        PlanEntity defaultPlan = plans.findById("plan_default").orElseGet(() -> {
            PlanEntity plan = new PlanEntity();
            plan.setId("plan_default");
            plan.setName("Default Wedding Plan");
            return plans.save(plan);
        });

        AppUserEntity admin = users.findByEmailIgnoreCase(adminEmail).orElseGet(() -> {
            AppUserEntity user = new AppUserEntity();
            user.setId(ids.uid("usr"));
            user.setEmail(adminEmail.trim().toLowerCase());
            user.setDisplayName("Admin");
            user.setPasswordHash(passwords.encode(adminPassword));
            user.setAdmin(true);
            return users.save(user);
        });

        if (!admin.isAdmin()) {
            admin.setAdmin(true);
            users.save(admin);
        }

        if (!accessRepo.existsByUserIdAndPlanId(admin.getId(), defaultPlan.getId())) {
            UserPlanAccessEntity access = new UserPlanAccessEntity();
            access.setId(ids.uid("acc"));
            access.setUserId(admin.getId());
            access.setPlanId(defaultPlan.getId());
            accessRepo.save(access);
        }
    }
}
