package com.example.weddingplanner.api.dto;

public record AuditEntryDto(
        String id,
        String userId,
        String userDisplayName,
        String userEmail,
        String planId,
        String action,
        String entityType,
        String entityId,
        String summary,
        String createdAt
) {
}
