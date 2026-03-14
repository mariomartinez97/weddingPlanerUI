package com.example.weddingplanner.config;

public record AuthPrincipal(
        String userId,
        String email,
        String displayName,
        String planId
) {
}
