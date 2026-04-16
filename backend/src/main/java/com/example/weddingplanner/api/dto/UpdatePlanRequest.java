package com.example.weddingplanner.api.dto;

import java.util.List;

public record UpdatePlanRequest(
        String name,
        String status,
        List<String> assignedUserIds
) {
}
