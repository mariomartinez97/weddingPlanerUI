package com.example.weddingplanner.api.dto;

import java.math.BigDecimal;

public record BudgetStateDto(BigDecimal totalBudget, String currency) {}
