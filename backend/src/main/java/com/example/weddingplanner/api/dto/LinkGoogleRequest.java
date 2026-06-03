package com.example.weddingplanner.api.dto;

import jakarta.validation.constraints.NotBlank;

public record LinkGoogleRequest(
        @NotBlank String idToken
) {}
