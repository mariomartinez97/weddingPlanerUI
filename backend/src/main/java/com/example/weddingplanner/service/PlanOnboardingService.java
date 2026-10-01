package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.AccessiblePlanDto;
import com.example.weddingplanner.api.dto.CreatePlanResponse;
import com.example.weddingplanner.api.dto.JoinPlanResponse;
import com.example.weddingplanner.api.dto.JoinRequestDto;
import com.example.weddingplanner.api.dto.JoinStatusResponse;
import com.example.weddingplanner.persistence.entity.JoinRequestEntity;
import com.example.weddingplanner.persistence.entity.JoinRequestStatus;
import com.example.weddingplanner.persistence.entity.PlanAccessRole;
import com.example.weddingplanner.persistence.entity.PlanEntity;
import com.example.weddingplanner.persistence.entity.PlanStatus;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.JoinRequestRepository;
import com.example.weddingplanner.persistence.repo.PlanRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class PlanOnboardingService {

    private final PlanRepository plans;
    private final UserPlanAccessRepository accessRepo;
    private final JoinRequestRepository joinRequests;
    private final IdService ids;
    private final InviteCodeGenerator codeGen;

    public PlanOnboardingService(
            PlanRepository plans,
            UserPlanAccessRepository accessRepo,
            JoinRequestRepository joinRequests,
            IdService ids,
            InviteCodeGenerator codeGen
    ) {
        this.plans = plans;
        this.accessRepo = accessRepo;
        this.joinRequests = joinRequests;
        this.ids = ids;
        this.codeGen = codeGen;
    }

    @Transactional
    public CreatePlanResponse createPlan(String userId, String planName) {
        if (planName == null || planName.trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Plan name is required");
        }
        String trimmed = planName.trim();
        if (trimmed.length() < 3 || trimmed.length() > 100) {
            throw new ResponseStatusException(BAD_REQUEST, "Plan name must be between 3 and 100 characters");
        }
        if (plans.existsByNameIgnoreCase(trimmed)) {
            throw new ResponseStatusException(CONFLICT, "A plan with this name already exists");
        }

        String inviteCode = codeGen.generate();

        PlanEntity plan = new PlanEntity();
        plan.setId(ids.uid("plan"));
        plan.setName(trimmed);
        plan.setStatus(PlanStatus.ACTIVE);
        plan.setInviteCode(inviteCode);
        plans.save(plan);

        UserPlanAccessEntity access = new UserPlanAccessEntity();
        access.setId(ids.uid("acc"));
        access.setUserId(userId);
        access.setPlanId(plan.getId());
        access.setAccessRole(PlanAccessRole.SUBSCRIPTION_ADMIN);
        accessRepo.save(access);

        AccessiblePlanDto planDto = new AccessiblePlanDto(plan.getId(), plan.getName(), PlanAccessRole.SUBSCRIPTION_ADMIN.name());
        return new CreatePlanResponse(planDto, inviteCode);
    }

    @Transactional
    public JoinPlanResponse submitJoinRequest(String userId, String inviteCode) {
        if (inviteCode == null || inviteCode.trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Invite code is required");
        }

        PlanEntity plan = plans.findByInviteCode(inviteCode.trim().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "No plan found with this invite code"));

        if (accessRepo.existsByUserIdAndPlanId(userId, plan.getId())) {
            throw new ResponseStatusException(CONFLICT, "You already have access to this plan");
        }

        if (joinRequests.existsByUserIdAndPlanIdAndStatus(userId, plan.getId(), JoinRequestStatus.PENDING)) {
            throw new ResponseStatusException(CONFLICT, "You already have a pending request for this plan");
        }

        long rejections = joinRequests.countByUserIdAndPlanIdAndStatus(userId, plan.getId(), JoinRequestStatus.REJECTED);
        if (rejections >= 2) {
            throw new ResponseStatusException(FORBIDDEN, "You have been rejected twice for this plan. The admin must add you manually.");
        }

        JoinRequestEntity req = new JoinRequestEntity();
        req.setId(ids.uid("jreq"));
        req.setUserId(userId);
        req.setPlanId(plan.getId());
        req.setStatus(JoinRequestStatus.PENDING);
        joinRequests.save(req);

        return new JoinPlanResponse(req.getId(), plan.getName(), "PENDING");
    }

    public JoinStatusResponse getJoinStatus(String userId) {
        List<JoinRequestEntity> reqs = joinRequests.findAllByUserId(userId);
        Map<String, PlanEntity> planMap = plans.findAllById(
                reqs.stream().map(JoinRequestEntity::getPlanId).distinct().toList()
        ).stream().collect(Collectors.toMap(PlanEntity::getId, Function.identity()));

        List<JoinRequestDto> dtos = reqs.stream().map(r -> {
            PlanEntity plan = planMap.get(r.getPlanId());
            String planName = plan != null ? plan.getName() : "Unknown";
            return new JoinRequestDto(r.getId(), planName, r.getStatus().name(),
                    r.getCreatedAt(), r.getResolvedAt(), r.getReason());
        }).toList();

        return new JoinStatusResponse(dtos);
    }
}
