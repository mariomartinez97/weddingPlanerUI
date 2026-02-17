package com.example.weddingplanner.api.dto;

public record InviteeDto(
        String id,
        String inviteId,
        String fullName,
        String rsvp,
        String mealChoice,
        String notes
) {}
