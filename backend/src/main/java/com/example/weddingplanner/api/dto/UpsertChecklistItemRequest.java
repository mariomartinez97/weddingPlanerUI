package com.example.weddingplanner.api.dto;

public record UpsertChecklistItemRequest(
        String title,
        String owner,
        String dueDate,
        Boolean done,
        String notes
) {}
