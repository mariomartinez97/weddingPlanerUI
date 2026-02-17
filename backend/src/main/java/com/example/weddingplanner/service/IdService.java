package com.example.weddingplanner.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class IdService {
    private static final String ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789";
    private final SecureRandom rnd = new SecureRandom();

    public String uid(String prefix) {
        StringBuilder sb = new StringBuilder(prefix).append("_");
        for (int i = 0; i < 12; i++) sb.append(ALPHANUM.charAt(rnd.nextInt(ALPHANUM.length())));
        return sb.toString();
    }
}
