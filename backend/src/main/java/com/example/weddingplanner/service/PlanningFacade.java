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

    private static final String BUDGET_ROW_ID = "budget_main";

    private final IdService ids;
    private final InviteeRepository invitees;
    private final BudgetStateRepository budgetStateRepo;
    private final BudgetExpenseRepository budgetExpenseRepo;
    private final ChecklistItemRepository checklistRepo;
    private final AppointmentRepository appointmentRepo;
    private final SeatingTableRepository seatingTableRepo;
    private final SeatingAssignmentRepository seatingAssignmentRepo;

    public PlanningFacade(
            IdService ids,
            InviteeRepository invitees,
            BudgetStateRepository budgetStateRepo,
            BudgetExpenseRepository budgetExpenseRepo,
            ChecklistItemRepository checklistRepo,
            AppointmentRepository appointmentRepo,
            SeatingTableRepository seatingTableRepo,
            SeatingAssignmentRepository seatingAssignmentRepo
    ) {
        this.ids = ids;
        this.invitees = invitees;
        this.budgetStateRepo = budgetStateRepo;
        this.budgetExpenseRepo = budgetExpenseRepo;
        this.checklistRepo = checklistRepo;
        this.appointmentRepo = appointmentRepo;
        this.seatingTableRepo = seatingTableRepo;
        this.seatingAssignmentRepo = seatingAssignmentRepo;
    }

    // ---- Budget ----

    public BudgetPayloadDto getBudget() {
        BudgetStateEntity state = getOrCreateBudgetState();
        return new BudgetPayloadDto(
                new BudgetStateDto(zeroIfNull(state.getTotalBudget()), safeCurrency(state.getCurrency())),
                budgetExpenseRepo.findAllByOrderByCategoryAsc().stream().map(this::toDto).toList()
        );
    }

    @Transactional
    public BudgetStateDto updateBudgetState(UpdateBudgetStateRequest req) {
        BudgetStateEntity state = getOrCreateBudgetState();
        state.setTotalBudget(req.totalBudget() == null ? BigDecimal.ZERO : req.totalBudget());
        state.setCurrency(safeCurrency(req.currency()));
        budgetStateRepo.save(state);
        return new BudgetStateDto(state.getTotalBudget(), state.getCurrency());
    }

    @Transactional
    public BudgetExpenseDto createExpense(UpsertBudgetExpenseRequest req) {
        BudgetExpenseEntity e = new BudgetExpenseEntity();
        e.setId(ids.uid("exp"));
        applyExpense(e, req);
        budgetExpenseRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public BudgetExpenseDto updateExpense(String expenseId, UpsertBudgetExpenseRequest req) {
        BudgetExpenseEntity e = budgetExpenseRepo.findById(expenseId).orElseThrow();
        applyExpense(e, req);
        budgetExpenseRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public void deleteExpense(String expenseId) {
        budgetExpenseRepo.deleteById(expenseId);
    }

    @Transactional
    public void clearExpenses() {
        budgetExpenseRepo.deleteAll();
    }

    // ---- Checklist ----

    public List<ChecklistItemDto> listChecklistItems() {
        return checklistRepo.findAllByOrderByDoneAscDueDateAscTitleAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public ChecklistItemDto createChecklistItem(UpsertChecklistItemRequest req) {
        ChecklistItemEntity e = new ChecklistItemEntity();
        e.setId(ids.uid("task"));
        applyChecklist(e, req);
        checklistRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public ChecklistItemDto updateChecklistItem(String itemId, UpsertChecklistItemRequest req) {
        ChecklistItemEntity e = checklistRepo.findById(itemId).orElseThrow();
        applyChecklist(e, req);
        checklistRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public void deleteChecklistItem(String itemId) {
        checklistRepo.deleteById(itemId);
    }

    @Transactional
    public void clearChecklistItems() {
        checklistRepo.deleteAll();
    }

    // ---- Calendar ----

    public List<AppointmentDto> listAppointments() {
        return appointmentRepo.findAllByOrderByStartAtAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public AppointmentDto createAppointment(UpsertAppointmentRequest req) {
        AppointmentEntity e = new AppointmentEntity();
        e.setId(ids.uid("appt"));
        applyAppointment(e, req);
        appointmentRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public AppointmentDto updateAppointment(String id, UpsertAppointmentRequest req) {
        AppointmentEntity e = appointmentRepo.findById(id).orElseThrow();
        applyAppointment(e, req);
        appointmentRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public void deleteAppointment(String id) {
        appointmentRepo.deleteById(id);
    }

    @Transactional
    public void clearAppointments() {
        appointmentRepo.deleteAll();
    }

    // ---- Seating ----

    public SeatingPayloadDto getSeating() {
        return new SeatingPayloadDto(
                seatingTableRepo.findAllByOrderByNameAsc().stream().map(this::toDto).toList(),
                seatingAssignmentRepo.findAllByOrderByTableIdAscInviteeIdAsc().stream().map(this::toDto).toList()
        );
    }

    @Transactional
    public SeatingPayloadDto replaceTables(List<SeatingTableDto> tables) {
        List<SeatingTableDto> safeTables = tables == null ? List.of() : tables;

        if (safeTables.isEmpty()) {
            seatingAssignmentRepo.deleteAll();
            seatingTableRepo.deleteAll();
            return new SeatingPayloadDto(List.of(), List.of());
        }

        List<String> idsToKeep = safeTables.stream().map(SeatingTableDto::id).filter(PlanningFacade::hasText).toList();
        if (!idsToKeep.isEmpty()) seatingTableRepo.deleteByIdNotIn(idsToKeep);

        for (SeatingTableDto t : safeTables) {
            if (!hasText(t.id()) || !hasText(t.name())) continue;
            SeatingTableEntity e = new SeatingTableEntity();
            e.setId(t.id().trim());
            e.setName(t.name().trim());
            e.setSeats(t.seats() == null || t.seats() < 1 ? 1 : t.seats());
            seatingTableRepo.save(e);
        }

        return getSeating();
    }

    @Transactional
    public SeatingAssignmentDto assignSeat(String inviteeId, AssignSeatRequest req) {
        if (!invitees.existsById(inviteeId)) throw new IllegalArgumentException("Invitee not found");
        if (req == null || !hasText(req.tableId()) || !seatingTableRepo.existsById(req.tableId().trim())) {
            throw new IllegalArgumentException("Table not found");
        }

        SeatingAssignmentEntity e = new SeatingAssignmentEntity();
        e.setInviteeId(inviteeId);
        e.setTableId(req.tableId().trim());
        e.setSeatNumber(req.seatNumber());
        seatingAssignmentRepo.save(e);
        return toDto(e);
    }

    @Transactional
    public void unassignSeat(String inviteeId) {
        seatingAssignmentRepo.deleteById(inviteeId);
    }

    @Transactional
    public void clearAssignments() {
        seatingAssignmentRepo.deleteAll();
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
        return budgetStateRepo.findById(BUDGET_ROW_ID).orElseGet(() -> {
            BudgetStateEntity e = new BudgetStateEntity();
            e.setId(BUDGET_ROW_ID);
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
