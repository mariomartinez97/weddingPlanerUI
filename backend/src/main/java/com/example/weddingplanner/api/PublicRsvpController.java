package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.PublicInviteDto;
import com.example.weddingplanner.api.dto.PublicInviteeDto;
import com.example.weddingplanner.api.dto.UpdateInviteRsvpRequest;
import com.example.weddingplanner.api.dto.UpdateInviteeRsvpRequest;
import com.example.weddingplanner.service.InvitesFacade;
import com.example.weddingplanner.service.PublicRsvpAccessService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/rsvp")
public class PublicRsvpController {

    private final PublicRsvpAccessService access;
    private final InvitesFacade invites;

    public PublicRsvpController(PublicRsvpAccessService access, InvitesFacade invites) {
        this.access = access;
        this.invites = invites;
    }

    @GetMapping("/invites/search")
    public List<PublicInviteDto> searchInvites(
            @RequestHeader("X-Public-Rsvp-Token") String token,
            @RequestHeader("X-Plan-Id") String planId,
            @RequestParam("q") String q
    ) {
        access.authorize(token, planId);
        return invites.searchPublicByName(planId.trim(), q);
    }

    @PatchMapping("/invites/{inviteId}/rsvp")
    public List<PublicInviteeDto> patchInviteRsvp(
            @RequestHeader("X-Public-Rsvp-Token") String token,
            @RequestHeader("X-Plan-Id") String planId,
            @PathVariable String inviteId,
            @RequestBody UpdateInviteRsvpRequest req
    ) {
        access.authorize(token, planId);
        boolean includeCompanions = Boolean.TRUE.equals(req.includeCompanions());
        return invites.publicPatchInviteRsvp(planId.trim(), access.actorUserId(), inviteId, req.rsvp(), includeCompanions);
    }

    @PatchMapping("/invitees/{inviteeId}/rsvp")
    public PublicInviteeDto patchInviteeRsvp(
            @RequestHeader("X-Public-Rsvp-Token") String token,
            @RequestHeader("X-Plan-Id") String planId,
            @PathVariable String inviteeId,
            @RequestBody UpdateInviteeRsvpRequest req
    ) {
        access.authorize(token, planId);
        return invites.publicPatchInviteeRsvp(planId.trim(), access.actorUserId(), inviteeId, req.rsvp());
    }
}
