package com.example.weddingplanner.api.dto;

public record AppointmentDto(
        String id,
        String type,
        String title,
        String withWhom,
        String start,
        String end,
        String location,
        String notes
) {}
