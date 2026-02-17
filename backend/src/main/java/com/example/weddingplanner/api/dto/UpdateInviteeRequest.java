package com.example.weddingplanner.api.dto;

public record UpdateInviteeRequest(
        String fullName,
        String rsvp,
        String mealChoice,
        String notes
) {}
