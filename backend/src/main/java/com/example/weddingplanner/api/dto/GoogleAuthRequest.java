package com.example.weddingplanner.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank String idToken,
        @NotBlank String intent
) {}
