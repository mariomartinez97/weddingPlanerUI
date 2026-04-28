package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.AdminUserDto;
import com.example.weddingplanner.api.dto.CreateAdminUserRequest;
import com.example.weddingplanner.api.dto.UpdateUserAccessRequest;
import com.example.weddingplanner.service.SubscriptionAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscription-admin")
public class SubscriptionAdminController {

    private final SubscriptionAdminService subscriptionAdmin;

    public SubscriptionAdminController(SubscriptionAdminService subscriptionAdmin) {
        this.subscriptionAdmin = subscriptionAdmin;
    }

    @GetMapping("/users")
    public List<AdminUserDto> listUsers() {
        return subscriptionAdmin.listUsers();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto createUser(@RequestBody CreateAdminUserRequest req) {
        return subscriptionAdmin.createUser(req);
    }

    @PutMapping("/users/{userId}/access")
    public AdminUserDto updateUserAccess(@PathVariable String userId, @RequestBody UpdateUserAccessRequest req) {
        return subscriptionAdmin.updateUserAccess(userId, req);
    }

    @DeleteMapping("/users/{userId}/access")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUserAccess(@PathVariable String userId) {
        subscriptionAdmin.deleteUserAccess(userId);
    }
}
