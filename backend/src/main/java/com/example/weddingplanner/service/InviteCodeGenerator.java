package com.example.weddingplanner.service;

import com.example.weddingplanner.persistence.repo.PlanRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class InviteCodeGenerator {

    // Excludes ambiguous chars: 0, O, 1, I, L
    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private final SecureRandom rnd = new SecureRandom();
    private final PlanRepository plans;

    public InviteCodeGenerator(PlanRepository plans) {
        this.plans = plans;
    }

    /**
     * Generates a unique invite code in XXX-XXX-XX format.
     * Checks for collisions against existing codes in the DB.
     */
    public String generate() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String raw = randomChars(CODE_LENGTH);
            String code = raw.substring(0, 3) + "-" + raw.substring(3, 6) + "-" + raw.substring(6, 8);
            if (plans.findByInviteCode(code).isEmpty()) {
                return code;
            }
        }
        throw new IllegalStateException("Failed to generate unique invite code after 10 attempts");
    }

    private String randomChars(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARS.charAt(rnd.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
