package com.example.weddingplanner.config;

import com.example.weddingplanner.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Component
public class AuthFilter extends OncePerRequestFilter {

    private final AuthService authService;

    public AuthFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/api/health") || path.equals("/api/auth/login");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String token = request.getHeader("X-Auth-Token");
            String planId = request.getHeader("X-Plan-Id");
            boolean requiresPlan = !request.getRequestURI().startsWith("/api/auth/");
            RequestContext.set(authService.authenticate(token, planId, requiresPlan));
            filterChain.doFilter(request, response);
        } catch (ResponseStatusException ex) {
            response.setStatus(ex.getStatusCode().value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            String message = ex.getReason() == null ? "Unauthorized" : ex.getReason();
            response.getWriter().write("{\"error\":\"" + message.replace("\"", "") + "\"}");
        } finally {
            RequestContext.clear();
        }
    }
}
