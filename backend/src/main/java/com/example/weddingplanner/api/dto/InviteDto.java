package com.example.weddingplanner.api.dto;

import java.util.List;

public record InviteDto(
        String id,
        String inviteName,
        ContactDto contact,
        String notes,
        List<InviteeDto> companions
) {}
