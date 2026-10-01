package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.CreatePlanOnboardingRequest;
import com.example.weddingplanner.api.dto.CreatePlanResponse;
import com.example.weddingplanner.api.dto.JoinPlanRequest;
import com.example.weddingplanner.api.dto.JoinPlanResponse;
import com.example.weddingplanner.api.dto.JoinStatusResponse;
import com.example.weddingplanner.config.RequestContext;
import com.example.weddingplanner.service.PlanOnboardingService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/plans")
public class PlanOnboardingController {

    private final PlanOnboardingService onboarding;

    public PlanOnboardingController(PlanOnboardingService onboarding) {
        this.onboarding = onboarding;
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public CreatePlanResponse createPlan(@RequestBody CreatePlanOnboardingRequest req) {
        String userId = RequestContext.getRequired().userId();
        return onboarding.createPlan(userId, req.planName());
    }

    @PostMapping("/join")
    @ResponseStatus(HttpStatus.CREATED)
    public JoinPlanResponse joinPlan(@RequestBody JoinPlanRequest req) {
        String userId = RequestContext.getRequired().userId();
        return onboarding.submitJoinRequest(userId, req.inviteCode());
    }

    @GetMapping("/join-status")
    public JoinStatusResponse joinStatus() {
        String userId = RequestContext.getRequired().userId();
        return onboarding.getJoinStatus(userId);
    }
}
