package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.AccessiblePlanDto;
import com.example.weddingplanner.api.dto.AdminUserDto;
import com.example.weddingplanner.api.dto.CreateAdminUserRequest;
import com.example.weddingplanner.api.dto.UpdateUserAccessRequest;
import com.example.weddingplanner.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    @GetMapping("/users")
    public List<AdminUserDto> listUsers() {
        return admin.listUsers();
    }

    @GetMapping("/plans")
    public List<AccessiblePlanDto> listPlans() {
        return admin.listPlans();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserDto createUser(@RequestBody CreateAdminUserRequest req) {
        return admin.createUser(req);
    }

    @PutMapping("/users/{userId}/access")
    public AdminUserDto updateUserAccess(@PathVariable String userId, @RequestBody UpdateUserAccessRequest req) {
        return admin.updateUserAccess(userId, req);
    }
}
