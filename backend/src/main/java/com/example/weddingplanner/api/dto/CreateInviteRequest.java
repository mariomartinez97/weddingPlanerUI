package com.example.weddingplanner.api.dto;

import java.util.List;

public record CreateInviteRequest(
        String inviteName,
        ContactDto contact,
        String notes,
        List<CreateInviteeRequest> companions
) {}
