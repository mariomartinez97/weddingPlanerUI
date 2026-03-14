package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.AuditEntryDto;
import com.example.weddingplanner.service.AuditQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AuditController {

    private final AuditQueryService audits;

    public AuditController(AuditQueryService audits) {
        this.audits = audits;
    }

    @GetMapping("/audit")
    public List<AuditEntryDto> listAudit() {
        return audits.listCurrentPlanAudit();
    }
}
