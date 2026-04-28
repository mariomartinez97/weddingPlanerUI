package com.example.weddingplanner.api.dto;

import java.util.List;

public record UpdateUserAccessRequest(
        Boolean isAdmin,
        List<String> planIds,
        List<String> subscriptionAdminPlanIds
) {
}
