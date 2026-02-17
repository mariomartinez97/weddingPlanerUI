package com.example.weddingplanner.api.dto;

public record CreateInviteeRequest(
        String fullName,
        String rsvp,
        String mealChoice,
        String notes
) {}
