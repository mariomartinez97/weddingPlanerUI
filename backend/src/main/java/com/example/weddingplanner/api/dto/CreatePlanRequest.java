package com.example.weddingplanner.api.dto;

import java.util.List;

public record CreatePlanRequest(
        String name,
        List<String> assignedUserIds
) {
}
