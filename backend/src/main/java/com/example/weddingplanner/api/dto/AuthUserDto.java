package com.example.weddingplanner.api.dto;

public record AuthUserDto(
        String id,
        String email,
        String displayName,
        boolean isAdmin,
        boolean isFullAdmin,
        String authProvider,
        String avatarUrl
) {
}
