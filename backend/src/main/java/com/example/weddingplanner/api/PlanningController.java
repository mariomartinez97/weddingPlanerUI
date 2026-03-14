package com.example.weddingplanner.api;

import com.example.weddingplanner.api.dto.*;
import com.example.weddingplanner.service.PlanningFacade;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PlanningController {

    private final PlanningFacade facade;

    public PlanningController(PlanningFacade facade) {
        this.facade = facade;
    }

    // ---- Budget ----

    @GetMapping("/budget")
    public BudgetPayloadDto getBudget() {
        return facade.getBudget();
    }

    @PutMapping("/budget/state")
    public BudgetStateDto updateBudgetState(@RequestBody UpdateBudgetStateRequest req) {
        return facade.updateBudgetState(req);
    }

    @PostMapping("/budget/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetExpenseDto createExpense(@RequestBody UpsertBudgetExpenseRequest req) {
        return facade.createExpense(req);
    }

    @PutMapping("/budget/expenses/{expenseId}")
    public BudgetExpenseDto updateExpense(@PathVariable String expenseId, @RequestBody UpsertBudgetExpenseRequest req) {
        return facade.updateExpense(expenseId, req);
    }

    @DeleteMapping("/budget/expenses/{expenseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(@PathVariable String expenseId) {
        facade.deleteExpense(expenseId);
    }

    @DeleteMapping("/budget/expenses")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearExpenses() {
        facade.clearExpenses();
    }

    // ---- Checklist ----

    @GetMapping("/checklist/items")
    public List<ChecklistItemDto> listChecklistItems() {
        return facade.listChecklistItems();
    }

    @PostMapping("/checklist/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ChecklistItemDto createChecklistItem(@RequestBody UpsertChecklistItemRequest req) {
        return facade.createChecklistItem(req);
    }

    @PutMapping("/checklist/items/{itemId}")
    public ChecklistItemDto updateChecklistItem(@PathVariable String itemId, @RequestBody UpsertChecklistItemRequest req) {
        return facade.updateChecklistItem(itemId, req);
    }

    @DeleteMapping("/checklist/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChecklistItem(@PathVariable String itemId) {
        facade.deleteChecklistItem(itemId);
    }

    @DeleteMapping("/checklist/items")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearChecklistItems() {
        facade.clearChecklistItems();
    }

    // ---- Calendar ----

    @GetMapping("/calendar/appointments")
    public List<AppointmentDto> listAppointments() {
        return facade.listAppointments();
    }

    @PostMapping("/calendar/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentDto createAppointment(@RequestBody UpsertAppointmentRequest req) {
        return facade.createAppointment(req);
    }

    @PutMapping("/calendar/appointments/{id}")
    public AppointmentDto updateAppointment(@PathVariable String id, @RequestBody UpsertAppointmentRequest req) {
        return facade.updateAppointment(id, req);
    }

    @DeleteMapping("/calendar/appointments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAppointment(@PathVariable String id) {
        facade.deleteAppointment(id);
    }

    @DeleteMapping("/calendar/appointments")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearAppointments() {
        facade.clearAppointments();
    }

    // ---- Seating ----

    @GetMapping("/seating")
    public SeatingPayloadDto getSeating() {
        return facade.getSeating();
    }

    @PutMapping("/seating/tables")
    public SeatingPayloadDto replaceTables(@RequestBody List<SeatingTableDto> tables) {
        return facade.replaceTables(tables);
    }

    @PutMapping("/seating/assignments/{inviteeId}")
    public SeatingAssignmentDto assignSeat(@PathVariable String inviteeId, @RequestBody AssignSeatRequest req) {
        return facade.assignSeat(inviteeId, req);
    }

    @DeleteMapping("/seating/assignments/{inviteeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unassignSeat(@PathVariable String inviteeId) {
        facade.unassignSeat(inviteeId);
    }

    @DeleteMapping("/seating/assignments")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearAssignments() {
        facade.clearAssignments();
    }
}
