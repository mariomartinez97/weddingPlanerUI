package com.example.weddingplanner.api.dto;

import java.util.List;

public record SeatingPayloadDto(List<SeatingTableDto> tables, List<SeatingAssignmentDto> assignments) {}
