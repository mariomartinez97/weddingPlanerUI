package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.*;
import com.example.weddingplanner.service.InvitesFacade;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class InvitesController {

    private final InvitesFacade facade;

    public InvitesController(InvitesFacade facade) {
        this.facade = facade;
    }

    @GetMapping("/invites")
    public List<InviteDto> listInvites() {
        return facade.listAll();
    }

    @GetMapping("/invites/search")
    public List<InviteDto> searchInvites(@RequestParam("q") String q) {
        return facade.searchByName(q);
    }

    @PostMapping("/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteDto createInvite(@RequestBody CreateInviteRequest req) {
        return facade.createInvite(req);
    }

    @PutMapping("/invites/{inviteId}")
    public InviteDto updateInvite(@PathVariable String inviteId, @RequestBody UpdateInviteRequest req) {
        return facade.updateInvite(inviteId, req);
    }

    @DeleteMapping("/invites/{inviteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInvite(@PathVariable String inviteId) {
        facade.deleteInvite(inviteId);
    }

    @PostMapping("/invites/{inviteId}/invitees")
    @ResponseStatus(HttpStatus.CREATED)
    public InviteeDto addInvitee(@PathVariable String inviteId, @RequestBody CreateInviteeRequest req) {
        return facade.addInvitee(inviteId, req);
    }

    @PutMapping("/invitees/{inviteeId}")
    public InviteeDto updateInvitee(@PathVariable String inviteeId, @RequestBody UpdateInviteeRequest req) {
        return facade.updateInvitee(inviteeId, req);
    }

    @PatchMapping("/invitees/{inviteeId}/rsvp")
    public InviteeDto patchInviteeRsvp(@PathVariable String inviteeId, @RequestBody UpdateInviteeRsvpRequest req) {
        return facade.patchInviteeRsvp(inviteeId, req.rsvp());
    }

    @PatchMapping("/invites/{inviteId}/rsvp")
    public List<InviteeDto> patchInviteRsvp(@PathVariable String inviteId, @RequestBody UpdateInviteRsvpRequest req) {
        boolean includeCompanions = Boolean.TRUE.equals(req.includeCompanions());
        return facade.patchInviteRsvp(inviteId, req.rsvp(), includeCompanions);
    }

    @DeleteMapping("/invitees/{inviteeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteInvitee(@PathVariable String inviteeId) {
        facade.deleteInvitee(inviteeId);
    }
}
