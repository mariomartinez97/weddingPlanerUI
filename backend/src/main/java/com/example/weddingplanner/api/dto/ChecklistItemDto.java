package com.example.weddingplanner.api.dto;

public record ChecklistItemDto(
        String id,
        String title,
        String owner,
        String dueDate,
        boolean done,
        String notes
) {}
