package com.example.weddingplanner.api.dto;

import java.math.BigDecimal;

public record UpdateBudgetStateRequest(BigDecimal totalBudget, String currency) {}
