package com.example.weddingplanner.config;

public final class RequestContext {
    private static final ThreadLocal<AuthPrincipal> CURRENT = new ThreadLocal<>();

    private RequestContext() {
    }

    public static void set(AuthPrincipal principal) {
        CURRENT.set(principal);
    }

    public static AuthPrincipal getRequired() {
        AuthPrincipal principal = CURRENT.get();
        if (principal == null) throw new IllegalStateException("Missing authenticated request context");
        return principal;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
