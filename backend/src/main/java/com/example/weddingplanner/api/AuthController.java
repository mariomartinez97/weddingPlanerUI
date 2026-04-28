package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.AuthSessionDto;
import com.example.weddingplanner.api.dto.LoginRequest;
import com.example.weddingplanner.api.dto.SignupRequest;
import com.example.weddingplanner.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthSessionDto login(@RequestBody LoginRequest req) {
        return auth.login(req);
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthSessionDto signup(@RequestBody SignupRequest req) {
        return auth.signup(req);
    }

    @GetMapping("/me")
    public AuthSessionDto me(@RequestHeader("X-Auth-Token") String token) {
        return auth.me(token);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader("X-Auth-Token") String token) {
        auth.logout(token);
    }
}
