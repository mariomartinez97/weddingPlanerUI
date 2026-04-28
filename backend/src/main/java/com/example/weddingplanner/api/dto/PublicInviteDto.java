package com.example.weddingplanner.api.dto;

import java.util.List;

public record PublicInviteDto(
        String id,
        String inviteName,
        List<PublicInviteeDto> companions
) {}
