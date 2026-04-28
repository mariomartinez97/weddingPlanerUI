package com.example.weddingplanner.api.dto;

import java.util.List;

public record CreateAdminUserRequest(
        String email,
        String displayName,
        String password,
        Boolean isAdmin,
        List<String> planIds,
        List<String> subscriptionAdminPlanIds
) {
}
