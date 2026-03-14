package com.example.weddingplanner.service;

import com.example.weddingplanner.api.dto.*;
import com.example.weddingplanner.persistence.entity.*;
import com.example.weddingplanner.persistence.repo.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PlanningFacade {

    private final IdService ids;
    private final InviteeRepository invitees;
    private final BudgetStateRepository budgetStateRepo;
    private final BudgetExpenseRepository budgetExpenseRepo;
    private final ChecklistItemRepository checklistRepo;
    private final AppointmentRepository appointmentRepo;
    private final SeatingTableRepository seatingTableRepo;
    private final SeatingAssignmentRepository seatingAssignmentRepo;
    private final AuthContextService auth;
    private final AuditService audit;

    public PlanningFacade(
            IdService ids,
            InviteeRepository invitees,
            BudgetStateRepository budgetStateRepo,
            BudgetExpenseRepository budgetExpenseRepo,
            ChecklistItemRepository checklistRepo,
            AppointmentRepository appointmentRepo,
            SeatingTableRepository seatingTableRepo,
            SeatingAssignmentRepository seatingAssignmentRepo,
            AuthContextService auth,
            AuditService audit
    ) {
        this.ids = ids;
        this.invitees = invitees;
        this.budgetStateRepo = budgetStateRepo;
        this.budgetExpenseRepo = budgetExpenseRepo;
        this.checklistRepo = checklistRepo;
        this.appointmentRepo = appointmentRepo;
        this.seatingTableRepo = seatingTableRepo;
        this.seatingAssignmentRepo = seatingAssignmentRepo;
        this.auth = auth;
        this.audit = audit;
    }

    // ---- Budget ----

    public BudgetPayloadDto getBudget() {
        BudgetStateEntity state = getOrCreateBudgetState();
        return new BudgetPayloadDto(
                new BudgetStateDto(zeroIfNull(state.getTotalBudget()), safeCurrency(state.getCurrency())),
                budgetExpenseRepo.findAllByPlanIdOrderByCategoryAsc(auth.currentPlanId()).stream().map(this::toDto).toList()
        );
    }

    @Transactional
    public BudgetStateDto updateBudgetState(UpdateBudgetStateRequest req) {
        BudgetStateEntity state = getOrCreateBudgetState();
        state.setTotalBudget(req.totalBudget() == null ? BigDecimal.ZERO : req.totalBudget());
        state.setCurrency(safeCurrency(req.currency()));
        budgetStateRepo.save(state);
        audit.record("update", "budget_state", state.getId(), "Updated budget state");
        return new BudgetStateDto(state.getTotalBudget(), state.getCurrency());
    }

    @Transactional
    public BudgetExpenseDto createExpense(UpsertBudgetExpenseRequest req) {
        BudgetExpenseEntity e = new BudgetExpenseEntity();
        e.setId(ids.uid("exp"));
        e.setPlanId(auth.currentPlanId());
        applyExpense(e, req);
        budgetExpenseRepo.save(e);
        audit.record("create", "budget_expense", e.getId(), "Created expense " + e.getCategory());
        return toDto(e);
    }

    @Transactional
    public BudgetExpenseDto updateExpense(String expenseId, UpsertBudgetExpenseRequest req) {
        BudgetExpenseEntity e = budgetExpenseRepo.findByIdAndPlanId(expenseId, auth.currentPlanId()).orElseThrow();
        applyExpense(e, req);
        budgetExpenseRepo.save(e);
        audit.record("update", "budget_expense", e.getId(), "Updated expense " + e.getCategory());
        return toDto(e);
    }

    @Transactional
    public void deleteExpense(String expenseId) {
        BudgetExpenseEntity expense = budgetExpenseRepo.findByIdAndPlanId(expenseId, auth.currentPlanId()).orElseThrow();
        budgetExpenseRepo.delete(expense);
        audit.record("delete", "budget_expense", expenseId, "Deleted expense " + expense.getCategory());
    }

    @Transactional
    public void clearExpenses() {
        budgetExpenseRepo.deleteAllByPlanId(auth.currentPlanId());
        audit.record("clear", "budget_expense", null, "Cleared budget expenses");
    }

    // ---- Checklist ----

    public List<ChecklistItemDto> listChecklistItems() {
        return checklistRepo.findAllByPlanIdOrderByDoneAscDueDateAscTitleAsc(auth.currentPlanId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public ChecklistItemDto createChecklistItem(UpsertChecklistItemRequest req) {
        ChecklistItemEntity e = new ChecklistItemEntity();
        e.setId(ids.uid("task"));
        e.setPlanId(auth.currentPlanId());
        applyChecklist(e, req);
        checklistRepo.save(e);
        audit.record("create", "checklist_item", e.getId(), "Created checklist item " + e.getTitle());
        return toDto(e);
    }

    @Transactional
    public ChecklistItemDto updateChecklistItem(String itemId, UpsertChecklistItemRequest req) {
        ChecklistItemEntity e = checklistRepo.findByIdAndPlanId(itemId, auth.currentPlanId()).orElseThrow();
        applyChecklist(e, req);
        checklistRepo.save(e);
        audit.record("update", "checklist_item", e.getId(), "Updated checklist item " + e.getTitle());
        return toDto(e);
    }

    @Transactional
    public void deleteChecklistItem(String itemId) {
        ChecklistItemEntity item = checklistRepo.findByIdAndPlanId(itemId, auth.currentPlanId()).orElseThrow();
        checklistRepo.delete(item);
        audit.record("delete", "checklist_item", itemId, "Deleted checklist item " + item.getTitle());
    }

    @Transactional
    public void clearChecklistItems() {
        checklistRepo.deleteAllByPlanId(auth.currentPlanId());
        audit.record("clear", "checklist_item", null, "Cleared checklist items");
    }

    // ---- Calendar ----

    public List<AppointmentDto> listAppointments() {
        return appointmentRepo.findAllByPlanIdOrderByStartAtAsc(auth.currentPlanId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public AppointmentDto createAppointment(UpsertAppointmentRequest req) {
        AppointmentEntity e = new AppointmentEntity();
        e.setId(ids.uid("appt"));
        e.setPlanId(auth.currentPlanId());
        applyAppointment(e, req);
        appointmentRepo.save(e);
        audit.record("create", "appointment", e.getId(), "Created appointment " + e.getTitle());
        return toDto(e);
    }

    @Transactional
    public AppointmentDto updateAppointment(String id, UpsertAppointmentRequest req) {
        AppointmentEntity e = appointmentRepo.findByIdAndPlanId(id, auth.currentPlanId()).orElseThrow();
        applyAppointment(e, req);
        appointmentRepo.save(e);
        audit.record("update", "appointment", e.getId(), "Updated appointment " + e.getTitle());
        return toDto(e);
    }

    @Transactional
    public void deleteAppointment(String id) {
        AppointmentEntity appointment = appointmentRepo.findByIdAndPlanId(id, auth.currentPlanId()).orElseThrow();
        appointmentRepo.delete(appointment);
        audit.record("delete", "appointment", id, "Deleted appointment " + appointment.getTitle());
    }

    @Transactional
    public void clearAppointments() {
        appointmentRepo.deleteAllByPlanId(auth.currentPlanId());
        audit.record("clear", "appointment", null, "Cleared appointments");
    }

    // ---- Seating ----

    public SeatingPayloadDto getSeating() {
        return new SeatingPayloadDto(
                seatingTableRepo.findAllByPlanIdOrderByNameAsc(auth.currentPlanId()).stream().map(this::toDto).toList(),
                seatingAssignmentRepo.findAllByPlanIdOrderByTableIdAscInviteeIdAsc(auth.currentPlanId()).stream().map(this::toDto).toList()
        );
    }

    @Transactional
    public SeatingPayloadDto replaceTables(List<SeatingTableDto> tables) {
        List<SeatingTableDto> safeTables = tables == null ? List.of() : tables;

        if (safeTables.isEmpty()) {
            seatingAssignmentRepo.deleteAllByPlanId(auth.currentPlanId());
            seatingTableRepo.deleteAllByPlanId(auth.currentPlanId());
            audit.record("clear", "seating_table", null, "Cleared seating tables");
            return new SeatingPayloadDto(List.of(), List.of());
        }

        List<String> idsToKeep = safeTables.stream().map(SeatingTableDto::id).filter(PlanningFacade::hasText).toList();
        if (!idsToKeep.isEmpty()) seatingTableRepo.deleteByPlanIdAndIdNotIn(auth.currentPlanId(), idsToKeep);

        for (SeatingTableDto t : safeTables) {
            if (!hasText(t.id()) || !hasText(t.name())) continue;
            SeatingTableEntity e = new SeatingTableEntity();
            e.setId(t.id().trim());
            e.setName(t.name().trim());
            e.setSeats(t.seats() == null || t.seats() < 1 ? 1 : t.seats());
            e.setPlanId(auth.currentPlanId());
            seatingTableRepo.save(e);
        }

        audit.record("replace", "seating_table", null, "Replaced seating tables");
        return getSeating();
    }

    @Transactional
    public SeatingAssignmentDto assignSeat(String inviteeId, AssignSeatRequest req) {
        if (!invitees.existsByIdAndInvite_PlanId(inviteeId, auth.currentPlanId())) throw new IllegalArgumentException("Invitee not found");
        if (req == null || !hasText(req.tableId()) || !seatingTableRepo.existsByIdAndPlanId(req.tableId().trim(), auth.currentPlanId())) {
            throw new IllegalArgumentException("Table not found");
        }

        SeatingAssignmentEntity e = new SeatingAssignmentEntity();
        e.setInviteeId(inviteeId);
        e.setTableId(req.tableId().trim());
        e.setSeatNumber(req.seatNumber());
        e.setPlanId(auth.currentPlanId());
        seatingAssignmentRepo.save(e);
        audit.record("assign", "seat_assignment", inviteeId, "Assigned seat");
        return toDto(e);
    }

    @Transactional
    public void unassignSeat(String inviteeId) {
        seatingAssignmentRepo.deleteById(inviteeId);
        audit.record("delete", "seat_assignment", inviteeId, "Removed seat assignment");
    }

    @Transactional
    public void clearAssignments() {
        seatingAssignmentRepo.deleteAllByPlanId(auth.currentPlanId());
        audit.record("clear", "seat_assignment", null, "Cleared seating assignments");
    }

    // ---- mapping/helpers ----

    private BudgetExpenseDto toDto(BudgetExpenseEntity e) {
        return new BudgetExpenseDto(
                e.getId(),
                e.getCategory(),
                e.getVendor(),
                zeroIfNull(e.getAmount()),
                e.isPaid(),
                e.getExpenseDate(),
                e.getNotes()
        );
    }

    private ChecklistItemDto toDto(ChecklistItemEntity e) {
        return new ChecklistItemDto(e.getId(), e.getTitle(), e.getOwner(), e.getDueDate(), e.isDone(), e.getNotes());
    }

    private AppointmentDto toDto(AppointmentEntity e) {
        return new AppointmentDto(e.getId(), e.getType(), e.getTitle(), e.getWithWhom(), e.getStartAt(), e.getEndAt(), e.getLocation(), e.getNotes());
    }

    private SeatingTableDto toDto(SeatingTableEntity e) {
        return new SeatingTableDto(e.getId(), e.getName(), e.getSeats());
    }

    private SeatingAssignmentDto toDto(SeatingAssignmentEntity e) {
        return new SeatingAssignmentDto(e.getInviteeId(), e.getTableId(), e.getSeatNumber());
    }

    private void applyExpense(BudgetExpenseEntity e, UpsertBudgetExpenseRequest req) {
        e.setCategory(hasText(req.category()) ? req.category().trim() : "Other");
        e.setVendor(blankToNull(req.vendor()));
        e.setAmount(req.amount() == null ? BigDecimal.ZERO : req.amount());
        e.setPaid(Boolean.TRUE.equals(req.paid()));
        e.setExpenseDate(blankToNull(req.date()));
        e.setNotes(blankToNull(req.notes()));
    }

    private void applyChecklist(ChecklistItemEntity e, UpsertChecklistItemRequest req) {
        e.setTitle(hasText(req.title()) ? req.title().trim() : "Untitled");
        e.setOwner(hasText(req.owner()) ? req.owner().trim() : "Unassigned");
        e.setDueDate(blankToNull(req.dueDate()));
        e.setDone(Boolean.TRUE.equals(req.done()));
        e.setNotes(blankToNull(req.notes()));
    }

    private void applyAppointment(AppointmentEntity e, UpsertAppointmentRequest req) {
        e.setType(normalizeType(req.type()));
        e.setTitle(hasText(req.title()) ? req.title().trim() : "Appointment");
        e.setWithWhom(hasText(req.withWhom()) ? req.withWhom().trim() : "Unknown");
        e.setStartAt(hasText(req.start()) ? req.start().trim() : "");
        e.setEndAt(hasText(req.end()) ? req.end().trim() : "");
        e.setLocation(blankToNull(req.location()));
        e.setNotes(blankToNull(req.notes()));
    }

    private BudgetStateEntity getOrCreateBudgetState() {
        String planId = auth.currentPlanId();
        return budgetStateRepo.findByPlanId(planId).orElseGet(() -> {
            BudgetStateEntity e = new BudgetStateEntity();
            e.setId(ids.uid("budget"));
            e.setPlanId(planId);
            e.setTotalBudget(BigDecimal.ZERO);
            e.setCurrency("CAD");
            return budgetStateRepo.save(e);
        });
    }

    private static String safeCurrency(String c) {
        if (!hasText(c)) return "CAD";
        String v = c.trim().toUpperCase();
        return switch (v) {
            case "CAD", "USD", "EUR" -> v;
            default -> "CAD";
        };
    }

    private static String normalizeType(String t) {
        if (!hasText(t)) return "PROVIDER";
        String v = t.trim().toUpperCase();
        return switch (v) {
            case "WEDDING_PLANNER", "VENUE_MANAGER", "PROVIDER" -> v;
            default -> "PROVIDER";
        };
    }

    private static BigDecimal zeroIfNull(BigDecimal n) { return n == null ? BigDecimal.ZERO : n; }
    private static String blankToNull(String s) { return hasText(s) ? s.trim() : null; }
    private static boolean hasText(String s) { return s != null && !s.trim().isEmpty(); }
}
