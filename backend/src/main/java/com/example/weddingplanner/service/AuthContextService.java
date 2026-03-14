package com.example.weddingplanner.service;

import com.example.weddingplanner.config.AuthPrincipal;
import com.example.weddingplanner.config.RequestContext;
import org.springframework.stereotype.Service;

@Service
public class AuthContextService {
    public AuthPrincipal current() {
        return RequestContext.getRequired();
    }

    public String currentUserId() {
        return current().userId();
    }

    public String currentPlanId() {
        return current().planId();
    }

    public boolean isAdmin() {
        return current().isAdmin();
    }
}
