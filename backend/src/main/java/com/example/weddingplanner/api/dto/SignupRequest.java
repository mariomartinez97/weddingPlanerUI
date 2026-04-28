package com.example.weddingplanner.api.dto;

public record SignupRequest(
        String fullName,
        String email,
        String password,
        String tier,
        String eventType,
        String subscriptionName,
        String notes
) {
}
