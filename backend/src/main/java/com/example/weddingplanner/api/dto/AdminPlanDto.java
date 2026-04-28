package com.example.weddingplanner.api.dto;

import java.util.List;

public record AdminPlanDto(
        String id,
        String name,
        String status,
        String createdAt,
        String updatedAt,
        String deactivatedAt,
        String archivedAt,
        String purgeAfter,
        List<String> assignedUserIds,
        int assignedUserCount,
        List<String> subscriptionAdminUserIds,
        int subscriptionAdminUserCount
) {
}
