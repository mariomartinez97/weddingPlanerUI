package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.PendingJoinRequestDto;
import com.example.weddingplanner.persistence.entity.AppUserEntity;
import com.example.weddingplanner.persistence.entity.JoinRequestEntity;
import com.example.weddingplanner.persistence.entity.JoinRequestStatus;
import com.example.weddingplanner.persistence.entity.PlanAccessRole;
import com.example.weddingplanner.persistence.entity.UserPlanAccessEntity;
import com.example.weddingplanner.persistence.repo.AppUserRepository;
import com.example.weddingplanner.persistence.repo.JoinRequestRepository;
import com.example.weddingplanner.persistence.repo.UserPlanAccessRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class JoinRequestService {

    private final JoinRequestRepository joinRequests;
    private final UserPlanAccessRepository accessRepo;
    private final AppUserRepository users;
    private final IdService ids;

    public JoinRequestService(
            JoinRequestRepository joinRequests,
            UserPlanAccessRepository accessRepo,
            AppUserRepository users,
            IdService ids
    ) {
        this.joinRequests = joinRequests;
        this.accessRepo = accessRepo;
        this.users = users;
        this.ids = ids;
    }

    public List<PendingJoinRequestDto> getPendingRequests(String planId) {
        return joinRequests.findAllByPlanIdAndStatus(planId, JoinRequestStatus.PENDING).stream()
                .map(req -> {
                    AppUserEntity user = users.findById(req.getUserId()).orElse(null);
                    if (user == null) return null;
                    return new PendingJoinRequestDto(
                            req.getId(), user.getId(), user.getEmail(), user.getDisplayName(),
                            user.getAvatarUrl(), req.getStatus().name(), req.getCreatedAt()
                    );
                })
                .filter(dto -> dto != null)
                .toList();
    }

    @Transactional
    public void approveRequest(String requestId, String planId, String adminUserId) {
        JoinRequestEntity req = joinRequests.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Join request not found"));
        ensureRequestBelongsToPlan(req, planId);
        if (req.getStatus() != JoinRequestStatus.PENDING) {
            throw new ResponseStatusException(BAD_REQUEST, "Request is not pending");
        }

        req.setStatus(JoinRequestStatus.APPROVED);
        req.setResolvedAt(OffsetDateTime.now());
        req.setResolvedBy(adminUserId);
        joinRequests.save(req);

        if (!accessRepo.existsByUserIdAndPlanId(req.getUserId(), req.getPlanId())) {
            UserPlanAccessEntity access = new UserPlanAccessEntity();
            access.setId(ids.uid("acc"));
            access.setUserId(req.getUserId());
            access.setPlanId(req.getPlanId());
            access.setAccessRole(PlanAccessRole.MEMBER);
            accessRepo.save(access);
        }
    }

    @Transactional
    public void rejectRequest(String requestId, String planId, String adminUserId, String reason) {
        JoinRequestEntity req = joinRequests.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Join request not found"));
        ensureRequestBelongsToPlan(req, planId);
        if (req.getStatus() != JoinRequestStatus.PENDING) {
            throw new ResponseStatusException(BAD_REQUEST, "Request is not pending");
        }

        req.setStatus(JoinRequestStatus.REJECTED);
        req.setReason(reason);
        req.setResolvedAt(OffsetDateTime.now());
        req.setResolvedBy(adminUserId);
        joinRequests.save(req);
    }

    private void ensureRequestBelongsToPlan(JoinRequestEntity req, String planId) {
        if (!req.getPlanId().equals(planId)) {
            throw new ResponseStatusException(NOT_FOUND, "Join request not found");
        }
    }
}
