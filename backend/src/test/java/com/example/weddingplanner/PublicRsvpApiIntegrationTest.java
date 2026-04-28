package com.example.weddingplanner;

import com.example.weddingplanner.persistence.entity.InviteEntity;
import com.example.weddingplanner.persistence.entity.InviteeEntity;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.repo.InviteRepository;
import com.example.weddingplanner.persistence.repo.InviteeRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicRsvpApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private PlanRepository plans;

    @Autowired
    private InviteRepository invites;

    @Autowired
    private InviteeRepository invitees;

    @BeforeEach
    void resetDatabase() {
        jdbc.update("DELETE FROM audit_log");
        jdbc.update("DELETE FROM auth_sessions");
        jdbc.update("DELETE FROM user_plan_access");
        jdbc.update("DELETE FROM invitees");
        jdbc.update("DELETE FROM invites");
        jdbc.update("DELETE FROM app_users");
        jdbc.update("DELETE FROM plans");
    }

    @Test
    void optionsRequestsBypassAuthFilter() throws Exception {
        mvc.perform(options("/api/invites")
                        .header("Origin", "https://example.github.io")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk());
    }

    @Test
    void publicRsvpSearchReturnsLimitedInviteShape() throws Exception {
        seedPlan("plan_public");
        seedInvite("inv_mario", "plan_public", "Mario Martinez", "private@example.com", "555-1111", "Private note");
        seedInvitee("pers_primary", "inv_mario", "Mario Martinez", "PENDING");
        seedInvitee("pers_guest", "inv_mario", "Maria Paula", "YES");

        mvc.perform(get("/api/public/rsvp/invites/search")
                        .header("X-Public-Rsvp-Token", "test-public-rsvp-token")
                        .header("X-Plan-Id", "plan_public")
                        .param("q", "mari"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("inv_mario"))
                .andExpect(jsonPath("$[0].inviteName").value("Mario Martinez"))
                .andExpect(jsonPath("$[0].contact").doesNotExist())
                .andExpect(jsonPath("$[0].notes").doesNotExist())
                .andExpect(jsonPath("$[0].companions", hasSize(2)))
                .andExpect(jsonPath("$[0].companions[0].fullName").value("Maria Paula"));
    }

    @Test
    void publicRsvpPatchUpdatesInviteAndAuditsWithPublicActor() throws Exception {
        seedPlan("plan_public");
        seedInvite("inv_mario", "plan_public", "Mario Martinez", null, null, null);
        seedInvitee("pers_primary", "inv_mario", "Mario Martinez", "PENDING");
        seedInvitee("pers_guest", "inv_mario", "Maria Paula", "PENDING");

        mvc.perform(patch("/api/public/rsvp/invites/inv_mario/rsvp")
                        .header("X-Public-Rsvp-Token", "test-public-rsvp-token")
                        .header("X-Plan-Id", "plan_public")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "rsvp": "YES",
                                  "includeCompanions": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].rsvp").value("YES"))
                .andExpect(jsonPath("$[1].rsvp").value("YES"));

        List<String> rsvps = invitees.findByInvite_Id("inv_mario").stream()
                .map(InviteeEntity::getRsvp)
                .toList();
        assertThat(rsvps).containsOnly("YES");

        Integer auditCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log a JOIN app_users u ON u.id = a.user_id WHERE a.plan_id = ? AND u.email = ?",
                Integer.class,
                "plan_public",
                "public-rsvp-test@system.local"
        );
        assertThat(auditCount).isEqualTo(1);
    }

    @Test
    void publicRsvpRejectsInvalidToken() throws Exception {
        seedPlan("plan_public");

        mvc.perform(get("/api/public/rsvp/invites/search")
                        .header("X-Public-Rsvp-Token", "wrong-token")
                        .header("X-Plan-Id", "plan_public")
                        .param("q", "mario"))
                .andExpect(status().isUnauthorized());
    }

    private void seedPlan(String id) {
        PlanEntity plan = new PlanEntity();
        plan.setId(id);
        plan.setName("Public Plan");
        plan.setStatus(PlanStatus.ACTIVE);
        plans.save(plan);
    }

    private void seedInvite(String id, String planId, String inviteName, String email, String phone, String notes) {
        InviteEntity invite = new InviteEntity();
        invite.setId(id);
        invite.setPlanId(planId);
        invite.setInviteName(inviteName);
        invite.setContactEmail(email);
        invite.setContactPhone(phone);
        invite.setNotes(notes);
        invites.save(invite);
    }

    private void seedInvitee(String id, String inviteId, String fullName, String rsvp) {
        InviteEntity invite = invites.findById(inviteId).orElseThrow();
        InviteeEntity invitee = new InviteeEntity();
        invitee.setId(id);
        invitee.setInvite(invite);
        invitee.setFullName(fullName);
        invitee.setRsvp(rsvp);
        invitees.save(invitee);
    }
}
