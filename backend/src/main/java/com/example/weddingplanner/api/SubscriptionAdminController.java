package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.AdminUserDto;
import com.example.weddingplanner.api.dto.CreateAdminUserRequest;
import com.example.weddingplanner.api.dto.InviteCodeResponse;
import com.example.weddingplanner.api.dto.PendingJoinRequestDto;
import com.example.weddingplanner.api.dto.PreapprovedEmailDto;
import com.example.weddingplanner.api.dto.PreapprovedEmailRequest;
import com.example.weddingplanner.api.dto.RejectJoinRequestRequest;
import com.example.weddingplanner.api.dto.UpdateUserAccessRequest;
import com.example.weddingplanner.config.RequestContext;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import com.example.weddingplanner.service.InviteCodeGenerator;
import com.example.weddingplanner.service.JoinRequestService;
import com.example.weddingplanner.service.PreapprovedEmailService;
import com.example.weddingplanner.service.SubscriptionAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscription-admin")
public class SubscriptionAdminController {

    private final SubscriptionAdminService subscriptionAdmin;
    private final JoinRequestService joinRequestService;
    private final PreapprovedEmailService preapprovedEmailService;
    private final PlanRepository planRepository;
    private final InviteCodeGenerator codeGen;

    public SubscriptionAdminController(
            SubscriptionAdminService subscriptionAdmin,
            JoinRequestService joinRequestService,
            PreapprovedEmailService preapprovedEmailService,
            PlanRepository planRepository,
            InviteCodeGenerator codeGen
    ) {
        this.subscriptionAdmin = subscriptionAdmin;
        this.joinRequestService = joinRequestService;
        this.preapprovedEmailService = preapprovedEmailService;
        this.planRepository = planRepository;
        this.codeGen = codeGen;
    }

    // ── Existing user management ──

    @GetMapping("/users")
    public List<AdminUserDto> listUsers() {
        return subscriptionAdmin.listUsers();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto createUser(@RequestBody CreateAdminUserRequest req) {
        return subscriptionAdmin.createUser(req);
    }

    @PutMapping("/users/{userId}/access")
    public AdminUserDto updateUserAccess(@PathVariable String userId, @RequestBody UpdateUserAccessRequest req) {
        return subscriptionAdmin.updateUserAccess(userId, req);
    }

    @DeleteMapping("/users/{userId}/access")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUserAccess(@PathVariable String userId) {
        subscriptionAdmin.deleteUserAccess(userId);
    }

    // ── Join requests ──

    @GetMapping("/join-requests")
    public Map<String, List<PendingJoinRequestDto>> getJoinRequests() {
        String planId = RequestContext.getRequired().planId();
        return Map.of("requests", joinRequestService.getPendingRequests(planId));
    }

    @PostMapping("/join-requests/{requestId}/approve")
    public Map<String, String> approveJoinRequest(@PathVariable String requestId) {
        String planId = RequestContext.getRequired().planId();
        String adminUserId = RequestContext.getRequired().userId();
        joinRequestService.approveRequest(requestId, planId, adminUserId);
        return Map.of("requestId", requestId, "status", "APPROVED");
    }

    @PostMapping("/join-requests/{requestId}/reject")
    public Map<String, String> rejectJoinRequest(@PathVariable String requestId, @RequestBody(required = false) RejectJoinRequestRequest req) {
        String planId = RequestContext.getRequired().planId();
        String adminUserId = RequestContext.getRequired().userId();
        String reason = req != null ? req.reason() : null;
        joinRequestService.rejectRequest(requestId, planId, adminUserId, reason);
        return Map.of("requestId", requestId, "status", "REJECTED");
    }

    // ── Pre-approved emails ──

    @PostMapping("/preapproved-emails")
    @ResponseStatus(HttpStatus.CREATED)
    public PreapprovedEmailDto addPreapprovedEmail(@RequestBody PreapprovedEmailRequest req) {
        String planId = RequestContext.getRequired().planId();
        String createdBy = RequestContext.getRequired().userId();
        return preapprovedEmailService.addPreapprovedEmail(planId, req.email(), req.role(), createdBy);
    }

    @GetMapping("/preapproved-emails")
    public List<PreapprovedEmailDto> listPreapprovedEmails() {
        String planId = RequestContext.getRequired().planId();
        return preapprovedEmailService.listPreapprovedEmails(planId);
    }

    @DeleteMapping("/preapproved-emails/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePreapprovedEmail(@PathVariable String id) {
        String planId = RequestContext.getRequired().planId();
        preapprovedEmailService.removePreapprovedEmail(id, planId);
    }

    // ── Invite code ──

    @GetMapping("/invite-code")
    public InviteCodeResponse getInviteCode() {
        PlanEntity plan = currentPlan();
        return new InviteCodeResponse(plan.getInviteCode(), plan.getName());
    }

    @PostMapping("/invite-code/regenerate")
    public InviteCodeResponse regenerateInviteCode() {
        PlanEntity plan = currentPlan();
        String newCode = codeGen.generate();
        plan.setInviteCode(newCode);
        planRepository.save(plan);
        return new InviteCodeResponse(newCode, plan.getName());
    }

    private PlanEntity currentPlan() {
        String planId = RequestContext.getRequired().planId();
        PlanEntity plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        if (plan.getInviteCode() == null || plan.getInviteCode().isBlank()) {
            plan.setInviteCode(codeGen.generate());
            return planRepository.save(plan);
        }
        return plan;
    }
}
