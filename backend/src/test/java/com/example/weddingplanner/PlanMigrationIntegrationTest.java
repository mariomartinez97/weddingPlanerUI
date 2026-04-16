package com.example.weddingplanner;

import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class PlanMigrationIntegrationTest {

    @Autowired
    private PlanRepository plans;

    @Test
    void defaultPlanIsBackfilledWithLifecycleMetadata() {
        var plan = plans.findById("plan_default").orElseThrow();

        assertThat(plan.getStatus()).isEqualTo(PlanStatus.ACTIVE);
        assertThat(plan.getCreatedAt()).isNotNull();
        assertThat(plan.getUpdatedAt()).isNotNull();
        assertThat(plan.getDeactivatedAt()).isNull();
        assertThat(plan.getArchivedAt()).isNull();
        assertThat(plan.getPurgeAfter()).isNull();
    }
}
