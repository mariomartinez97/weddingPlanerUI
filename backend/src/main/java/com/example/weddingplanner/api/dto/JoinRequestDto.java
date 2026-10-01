package com.example.weddingplanner.api.dto;

import java.time.OffsetDateTime;

public record JoinRequestDto(
        String requestId,
        String planName,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt,
        String reason
) {
}
