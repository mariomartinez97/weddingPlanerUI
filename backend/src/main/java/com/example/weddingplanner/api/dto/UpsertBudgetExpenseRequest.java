package com.example.weddingplanner.api.dto;

import java.math.BigDecimal;

public record UpsertBudgetExpenseRequest(
        String category,
        String vendor,
        BigDecimal amount,
        Boolean paid,
        String date,
        String notes
) {}
