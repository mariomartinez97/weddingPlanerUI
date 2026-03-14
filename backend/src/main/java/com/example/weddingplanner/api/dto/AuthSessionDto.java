package com.example.weddingplanner.api.dto;

import java.util.List;

public record AuthSessionDto(
        String token,
        AuthUserDto user,
        List<AccessiblePlanDto> plans
) {
}
