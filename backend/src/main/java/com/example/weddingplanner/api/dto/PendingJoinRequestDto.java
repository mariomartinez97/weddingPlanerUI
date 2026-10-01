package com.example.weddingplanner.api.dto;

import java.time.OffsetDateTime;

public record PendingJoinRequestDto(
        String requestId,
        String userId,
        String email,
        String displayName,
        String avatarUrl,
        String status,
        OffsetDateTime createdAt
) {
}
