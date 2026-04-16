package com.example.weddingplanner;

import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminPlanApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlanRepository plans;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private UserPlanAccessRepository accessRepo;

    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @BeforeEach
    void resetDatabase() {
        jdbc.update("DELETE FROM audit_log");
        jdbc.update("DELETE FROM auth_sessions");
        jdbc.update("DELETE FROM user_plan_access");
        jdbc.update("DELETE FROM app_users");
        jdbc.update("DELETE FROM plans");
    }

    @Test
    void createPlanAssignsSelectedUsersAndCreatorWithoutPlanHeader() throws Exception {
        seedUser("usr_admin", "admin@example.com", "Admin", "secret123", true);
        seedUser("usr_staff", "staff@example.com", "Staff", "secret123", false);

        String token = login("admin@example.com", "secret123");

        String response = mvc.perform(post("/api/admin/plans")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Golden Package",
                                  "assignedUserIds": ["usr_staff"]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Golden Package"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.assignedUserCount").value(2))
                .andExpect(jsonPath("$.assignedUserIds", containsInAnyOrder("usr_admin", "usr_staff")))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode payload = objectMapper.readTree(response);
        String planId = payload.get("id").asText();

        assertThat(plans.findById(planId)).isPresent();
        assertThat(accessRepo.findAllByPlanId(planId).stream().map(UserPlanAccessEntity::getUserId).toList())
                .containsExactlyInAnyOrder("usr_admin", "usr_staff");
    }

    @Test
    void updatePlanRenamesItAndReplacesAssignedUsers() throws Exception {
        seedUser("usr_admin", "admin@example.com", "Admin", "secret123", true);
        seedUser("usr_old", "old@example.com", "Old User", "secret123", false);
        seedUser("usr_new", "new@example.com", "New User", "secret123", false);
        seedPlan("plan_alpha", "Alpha", PlanStatus.ACTIVE);
        seedAccess("acc_1", "usr_admin", "plan_alpha");
        seedAccess("acc_2", "usr_old", "plan_alpha");

        String token = login("admin@example.com", "secret123");

        mvc.perform(put("/api/admin/plans/plan_alpha")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Alpha Renamed",
                                  "status": "INACTIVE",
                                  "assignedUserIds": ["usr_new"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Alpha Renamed"))
                .andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.assignedUserIds", containsInAnyOrder("usr_new")))
                .andExpect(jsonPath("$.deactivatedAt").isNotEmpty())
                .andExpect(jsonPath("$.archivedAt").value(nullValue()))
                .andExpect(jsonPath("$.purgeAfter").value(nullValue()));

        PlanEntity plan = plans.findById("plan_alpha").orElseThrow();
        assertThat(plan.getStatus()).isEqualTo(PlanStatus.INACTIVE);
        assertThat(plan.getDeactivatedAt()).isNotNull();
        assertThat(accessRepo.findAllByPlanId("plan_alpha").stream().map(UserPlanAccessEntity::getUserId).toList())
                .containsExactly("usr_new");
    }

    @Test
    void archivePlanSetsRetentionFieldsAndReactivationClearsThem() throws Exception {
        seedUser("usr_admin", "admin@example.com", "Admin", "secret123", true);
        seedUser("usr_client", "client@example.com", "Client", "secret123", false);
        seedPlan("plan_archive", "Archive Me", PlanStatus.ACTIVE);
        seedAccess("acc_archive_1", "usr_admin", "plan_archive");
        seedAccess("acc_archive_2", "usr_client", "plan_archive");

        String token = login("admin@example.com", "secret123");

        String archivedResponse = mvc.perform(put("/api/admin/plans/plan_archive")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Archive Me",
                                  "status": "ARCHIVED",
                                  "assignedUserIds": ["usr_admin", "usr_client"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.archivedAt").isNotEmpty())
                .andExpect(jsonPath("$.purgeAfter").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode archivedPayload = objectMapper.readTree(archivedResponse);
        OffsetDateTime archivedAt = OffsetDateTime.parse(archivedPayload.get("archivedAt").asText());
        OffsetDateTime purgeAfter = OffsetDateTime.parse(archivedPayload.get("purgeAfter").asText());
        assertThat(ChronoUnit.DAYS.between(archivedAt, purgeAfter)).isEqualTo(30);

        mvc.perform(put("/api/admin/plans/plan_archive")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Archive Me Active",
                                  "status": "ACTIVE",
                                  "assignedUserIds": ["usr_admin"]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.deactivatedAt").value(nullValue()))
                .andExpect(jsonPath("$.archivedAt").value(nullValue()))
                .andExpect(jsonPath("$.purgeAfter").value(nullValue()))
                .andExpect(jsonPath("$.assignedUserIds", containsInAnyOrder("usr_admin")));

        PlanEntity plan = plans.findById("plan_archive").orElseThrow();
        assertThat(plan.getStatus()).isEqualTo(PlanStatus.ACTIVE);
        assertThat(plan.getArchivedAt()).isNull();
        assertThat(plan.getPurgeAfter()).isNull();
        assertThat(plan.getDeactivatedAt()).isNull();
    }

    @Test
    void inactiveOrArchivedPlansAreHiddenFromAuthAndRejectedForPlanScopedRequests() throws Exception {
        seedUser("usr_admin", "admin@example.com", "Admin", "secret123", true);
        seedUser("usr_member", "member@example.com", "Member", "secret123", false);
        seedPlan("plan_active", "Active Plan", PlanStatus.ACTIVE);
        seedPlan("plan_archived", "Archived Plan", PlanStatus.ARCHIVED);
        seedAccess("acc_active", "usr_member", "plan_active");
        seedAccess("acc_archived", "usr_member", "plan_archived");

        String loginResponse = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "member@example.com",
                                  "password": "secret123"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.plans", hasSize(1)))
                .andExpect(jsonPath("$.plans[0].id").value("plan_active"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String token = objectMapper.readTree(loginResponse).get("token").asText();

        mvc.perform(get("/api/audit")
                        .header("X-Auth-Token", token)
                        .header("X-Plan-Id", "plan_archived"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Plan access denied"));
    }

    @Test
    void userAccessEndpointsRejectInactivePlans() throws Exception {
        seedUser("usr_admin", "admin@example.com", "Admin", "secret123", true);
        seedUser("usr_member", "member@example.com", "Member", "secret123", false);
        seedPlan("plan_inactive", "Inactive Plan", PlanStatus.INACTIVE);

        String token = login("admin@example.com", "secret123");

        mvc.perform(put("/api/admin/users/usr_member/access")
                        .header("X-Auth-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "isAdmin": false,
                                  "planIds": ["plan_inactive"]
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("One or more plans do not exist or are not active"));
    }

    @Test
    void adminPlanListDefaultsToActiveOnlyAndCanIncludeInactive() throws Exception {
        seedUser("usr_admin", "admin@example.com", "Admin", "secret123", true);
        seedPlan("plan_active", "Active Plan", PlanStatus.ACTIVE);
        seedPlan("plan_inactive", "Inactive Plan", PlanStatus.INACTIVE);
        seedPlan("plan_archived", "Archived Plan", PlanStatus.ARCHIVED);

        String token = login("admin@example.com", "secret123");

        mvc.perform(get("/api/admin/plans")
                        .header("X-Auth-Token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("plan_active"));

        String response = mvc.perform(get("/api/admin/plans")
                        .header("X-Auth-Token", token)
                        .param("includeInactive", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        List<String> ids = objectMapper.readTree(response).findValuesAsText("id");
        assertThat(Set.copyOf(ids)).containsExactlyInAnyOrder("plan_active", "plan_inactive", "plan_archived");
    }

    private String login(String email, String password) throws Exception {
        String response = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s"
                                }
                                """.formatted(email, password)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("token").asText();
    }

    private void seedUser(String id, String email, String displayName, String password, boolean isAdmin) {
        AppUserEntity user = new AppUserEntity();
        user.setId(id);
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPasswordHash(passwords.encode(password));
        user.setAdmin(isAdmin);
        users.save(user);
    }

    private void seedPlan(String id, String name, PlanStatus status) {
        OffsetDateTime now = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        PlanEntity plan = new PlanEntity();
        plan.setId(id);
        plan.setName(name);
        plan.setStatus(status);
        plan.setCreatedAt(now);
        plan.setUpdatedAt(now);

        if (status == PlanStatus.INACTIVE) {
            plan.setDeactivatedAt(now);
        }
        if (status == PlanStatus.ARCHIVED) {
            plan.setArchivedAt(now);
            plan.setPurgeAfter(now.plusDays(30));
        }

        plans.save(plan);
    }

    private void seedAccess(String id, String userId, String planId) {
        UserPlanAccessEntity access = new UserPlanAccessEntity();
        access.setId(id);
        access.setUserId(userId);
        access.setPlanId(planId);
        accessRepo.save(access);
    }
}
