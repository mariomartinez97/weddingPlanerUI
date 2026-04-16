package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.AdminPlanDto;
import com.example.weddingplanner.api.dto.AdminUserDto;
import com.example.weddingplanner.api.dto.CreateAdminUserRequest;
import com.example.weddingplanner.api.dto.CreatePlanRequest;
import com.example.weddingplanner.api.dto.ResetUserPasswordRequest;
import com.example.weddingplanner.api.dto.UpdatePlanRequest;
import com.example.weddingplanner.api.dto.UpdateUserAccessRequest;
import com.example.weddingplanner.service.AdminService;
import com.example.weddingplanner.service.AdminPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;
    private final AdminPlanService adminPlans;

    public AdminController(AdminService admin, AdminPlanService adminPlans) {
        this.admin = admin;
        this.adminPlans = adminPlans;
    }

    @GetMapping("/users")
    public List<AdminUserDto> listUsers() {
        return admin.listUsers();
    }

    @GetMapping("/plans")
    public List<AdminPlanDto> listPlans(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return adminPlans.listPlans(includeInactive);
    }

    @GetMapping("/plans/{planId}")
    public AdminPlanDto getPlan(@PathVariable String planId) {
        return adminPlans.getPlan(planId);
    }

    @PostMapping("/plans")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPlanDto createPlan(@RequestBody CreatePlanRequest req) {
        return adminPlans.createPlan(req);
    }

    @PutMapping("/plans/{planId}")
    public AdminPlanDto updatePlan(@PathVariable String planId, @RequestBody UpdatePlanRequest req) {
        return adminPlans.updatePlan(planId, req);
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

    @PostMapping("/users/{userId}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable String userId, @RequestBody ResetUserPasswordRequest req) {
        admin.resetPassword(userId, req);
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable String userId) {
        admin.deleteUser(userId);
    }
}
