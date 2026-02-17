package com.example.weddingplanner.api.dto;

public record UpdateInviteRequest(
        String inviteName,
        ContactDto contact,
        String notes
) {}
