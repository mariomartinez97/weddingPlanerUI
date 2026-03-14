package com.example.weddingplanner.api.dto;

import java.math.BigDecimal;

public record BudgetExpenseDto(
        String id,
        String category,
        String vendor,
        BigDecimal amount,
        boolean paid,
        String date,
        String notes
) {}
