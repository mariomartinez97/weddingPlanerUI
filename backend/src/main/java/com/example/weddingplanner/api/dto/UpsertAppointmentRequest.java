package com.example.weddingplanner.api.dto;

public record UpsertAppointmentRequest(
        String type,
        String title,
        String withWhom,
        String start,
        String end,
        String location,
        String notes
) {}
