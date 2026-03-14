package com.example.weddingplanner.api.dto;

import java.util.List;

public record AdminUserDto(
        String id,
        String email,
        String displayName,
        boolean isAdmin,
        List<String> planIds
) {
}
