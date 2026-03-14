package com.example.weddingplanner.api.dto;

import java.util.List;

public record BudgetPayloadDto(BudgetStateDto state, List<BudgetExpenseDto> expenses) {}
