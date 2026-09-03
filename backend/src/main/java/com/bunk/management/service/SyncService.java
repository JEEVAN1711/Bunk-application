package com.bunk.management.service;

import com.bunk.management.dto.*;
import com.bunk.management.entity.*;
import com.bunk.management.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final CreditEntryRepository creditEntryRepository;
    private final PaymentEntryRepository paymentEntryRepository;
    private final CustomerRepository customerRepository;
    private final DutyShiftRepository dutyShiftRepository;
    private final FuelReadingRepository fuelReadingRepository;
    private final DutyClosingRepository dutyClosingRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public SyncBatchResponse processBatch(SyncBatchRequest request) {
        log.info("Processing sync batch: {} with {} items", request.getBatchId(), request.getItems().size());
        List<String> acknowledgedIds = new ArrayList<>();

        for (SyncItemDTO item : request.getItems()) {
            try {
                processSingleItem(item);
                acknowledgedIds.add(item.getSyncId());
            } catch (Exception ex) {
                log.error("Failed to sync item: syncId={} type={}", item.getSyncId(), item.getEntityType(), ex);
            }
        }

        return SyncBatchResponse.builder()
                .batchId(request.getBatchId())
                .success(true)
                .processedCount(acknowledgedIds.size())
                .acknowledgedSyncIds(acknowledgedIds)
                .message("Sync batch processed successfully")
                .build();
    }

    private void processSingleItem(SyncItemDTO item) {
        String type = item.getEntityType();
        Map<String, Object> p = item.getPayload();

        if ("DELETE".equalsIgnoreCase(item.getAction())) {
            switch (type) {
                case "CUSTOMER" -> customerRepository.deleteById(item.getSyncId());
                case "USER" -> userRepository.deleteById(item.getSyncId());
                case "CREDIT" -> creditEntryRepository.deleteById(item.getSyncId());
                case "PAYMENT" -> paymentEntryRepository.deleteById(item.getSyncId());
                case "DUTY" -> dutyShiftRepository.deleteById(item.getSyncId());
                case "PAYMENT_REQUEST" -> paymentRequestRepository.deleteById(item.getSyncId());
            }
            return;
        }

        switch (type) {
            case "CREDIT" -> {
                if (creditEntryRepository.existsById(item.getSyncId())) {
                    log.info("Idempotency: Credit entry {} already exists", item.getSyncId());
                    return;
                }
                String custId = (String) p.get("customerId");
                BigDecimal amt = new BigDecimal(p.get("totalAmount").toString());
                BigDecimal liters = new BigDecimal(p.get("liters").toString());
                BigDecimal rate = new BigDecimal(p.get("ratePerLiter").toString());

                CreditEntry entry = CreditEntry.builder()
                        .id(item.getSyncId())
                        .customerId(custId)
                        .customerName((String) p.get("customerName"))
                        .customerPhone((String) p.get("customerPhone"))
                        .dutyId((String) p.get("dutyId"))
                        .cashierId((String) p.get("cashierId"))
                        .cashierName((String) p.get("cashierName"))
                        .productType(ProductType.valueOf((String) p.get("productType")))
                        .liters(liters)
                        .ratePerLiter(rate)
                        .totalAmount(amt)
                        .vehicleNumber((String) p.get("vehicleNumber"))
                        .timestamp(LocalDateTime.now())
                        .status("ACTIVE")
                        .build();

                creditEntryRepository.save(entry);

                // Update Customer Ledger atomically
                customerRepository.findById(custId).ifPresent(c -> {
                    c.setTotalCredit(c.getTotalCredit().add(amt));
                    c.setCurrentBalance(c.getTotalCredit().subtract(c.getTotalPaid()));
                    customerRepository.save(c);
                });

                auditLogRepository.save(AuditLog.builder()
                        .entityName("CreditEntry")
                        .entityId(item.getSyncId())
                        .action("CREATE")
                        .performedBy(entry.getCashierName())
                        .timestamp(LocalDateTime.now())
                        .payloadSnapshot("Credit: " + amt)
                        .build());
            }
            case "PAYMENT" -> {
                if (paymentEntryRepository.existsById(item.getSyncId())) {
                    log.info("Idempotency: Payment entry {} already exists", item.getSyncId());
                    return;
                }
                String custId = (String) p.get("customerId");
                BigDecimal amt = new BigDecimal(p.get("amount").toString());

                PaymentEntry entry = PaymentEntry.builder()
                        .id(item.getSyncId())
                        .customerId(custId)
                        .customerName((String) p.get("customerName"))
                        .dutyId((String) p.get("dutyId"))
                        .cashierId((String) p.get("cashierId"))
                        .cashierName((String) p.get("cashierName"))
                        .amount(amt)
                        .paymentMethod(PaymentMethod.valueOf((String) p.get("paymentMethod")))
                        .referenceNo((String) p.get("referenceNo"))
                        .timestamp(LocalDateTime.now())
                        .notes((String) p.get("notes"))
                        .build();

                paymentEntryRepository.save(entry);

                // Update Customer Ledger atomically
                customerRepository.findById(custId).ifPresent(c -> {
                    c.setTotalPaid(c.getTotalPaid().add(amt));
                    c.setCurrentBalance(c.getTotalCredit().subtract(c.getTotalPaid()));
                    customerRepository.save(c);
                });

                auditLogRepository.save(AuditLog.builder()
                        .entityName("PaymentEntry")
                        .entityId(item.getSyncId())
                        .action("CREATE")
                        .performedBy(entry.getCashierName())
                        .timestamp(LocalDateTime.now())
                        .payloadSnapshot("Payment: " + amt)
                        .build());
            }
            case "DUTY_CLOSING" -> {
                if (!dutyClosingRepository.existsById(item.getSyncId())) {
                    DutyClosing closing = DutyClosing.builder()
                            .id(item.getSyncId())
                            .dutyId((String) p.get("dutyId"))
                            .shiftNumber((String) p.get("shiftNumber"))
                            .cashierId((String) p.get("cashierId"))
                            .cashierName((String) p.get("cashierName"))
                            .closedByAdminId((String) p.get("closedByAdminId"))
                            .closedByAdminName((String) p.get("closedByAdminName"))
                            .grossFuelSalesAmount(new BigDecimal(p.get("grossFuelSalesAmount").toString()))
                            .creditGivenAmount(new BigDecimal(p.get("creditGivenAmount").toString()))
                            .creditPaymentsCollected(new BigDecimal(p.get("creditPaymentsCollected").toString()))
                            .expectedCashBalance(new BigDecimal(p.get("expectedCashBalance").toString()))
                            .actualCashInHand(new BigDecimal(p.get("actualCashInHand").toString()))
                            .differenceAmount(new BigDecimal(p.get("differenceAmount").toString()))
                            .closingStatus(ClosingStatus.valueOf((String) p.get("closingStatus")))
                            .notes((String) p.get("notes"))
                            .closedAt(LocalDateTime.now())
                            .isLocked(true)
                            .build();

                    dutyClosingRepository.save(closing);

                    // Update shift status
                    dutyShiftRepository.findById(closing.getDutyId()).ifPresent(s -> {
                        s.setStatus("CLOSED");
                        s.setEndTime(closing.getClosedAt());
                        dutyShiftRepository.save(s);
                    });
                }
            }
            case "CUSTOMER" -> {
                Customer c = customerRepository.findById(item.getSyncId())
                        .orElseGet(() -> Customer.builder()
                                .id(item.getSyncId())
                                .totalCredit(BigDecimal.ZERO)
                                .totalPaid(BigDecimal.ZERO)
                                .currentBalance(BigDecimal.ZERO)
                                .active(true)
                                .createdAt(LocalDateTime.now())
                                .build());
                if (p.get("name") != null) c.setName((String) p.get("name"));
                if (p.get("phoneNumber") != null) c.setPhoneNumber((String) p.get("phoneNumber"));
                if (p.get("totalCredit") != null) c.setTotalCredit(new BigDecimal(p.get("totalCredit").toString()));
                if (p.get("totalPaid") != null) c.setTotalPaid(new BigDecimal(p.get("totalPaid").toString()));
                if (p.get("currentBalance") != null) c.setCurrentBalance(new BigDecimal(p.get("currentBalance").toString()));
                if (p.get("active") != null) c.setActive((Boolean) p.get("active"));
                customerRepository.save(c);
            }
            case "DUTY" -> {
                String id = item.getSyncId();
                String shiftNum = (String) p.get("shiftNumber");
                DutyShift s = dutyShiftRepository.findById(id)
                        .or(() -> shiftNum != null ? dutyShiftRepository.findByShiftNumber(shiftNum) : Optional.empty())
                        .orElseGet(() -> DutyShift.builder().id(id).build());
                s.setId(id);
                s.setShiftNumber(shiftNum != null ? shiftNum : "SHIFT-" + id);
                s.setCashierId((String) p.get("cashierId"));
                s.setCashierName((String) p.get("cashierName"));
                s.setSupportCashierId((String) p.get("supportCashierId"));
                s.setSupportCashierName((String) p.get("supportCashierName"));
                if (p.get("status") != null) {
                    s.setStatus((String) p.get("status"));
                } else if (s.getStatus() == null) {
                    s.setStatus("ACTIVE");
                }
                s.setNotes((String) p.get("notes"));
                if (s.getStartTime() == null) {
                    s.setStartTime(LocalDateTime.now());
                }
                dutyShiftRepository.save(s);
            }
            case "USER" -> {
                String id = item.getSyncId();
                String username = (String) p.get("username");
                String fullName = (String) p.get("fullName");
                String phone = (String) p.get("phone");
                String password = (String) p.get("password");
                String roleStr = (String) p.get("role");
                String photoUrl = (String) p.get("photoUrl");
                Boolean active = p.get("active") != null ? (Boolean) p.get("active") : true;

                User user = userRepository.findById(id).orElseGet(() -> User.builder().id(id).build());
                user.setUsername(username != null ? username.toLowerCase().trim() : "user_" + id);
                user.setFullName(fullName != null ? fullName : "User");
                user.setPhone(phone);
                user.setPasswordHash(password);
                user.setRole(roleStr != null ? Role.valueOf(roleStr) : Role.CASHIER);
                user.setPhotoUrl(photoUrl);
                user.setActive(active != null ? active : true);
                if (user.getCreatedAt() == null) {
                    user.setCreatedAt(LocalDateTime.now());
                }
                userRepository.save(user);

                auditLogRepository.save(AuditLog.builder()
                        .entityName("User")
                        .entityId(id)
                        .action(userRepository.existsById(id) ? "UPDATE" : "CREATE")
                        .performedBy("SYSTEM_SYNC")
                        .timestamp(LocalDateTime.now())
                        .payloadSnapshot("User: " + user.getUsername() + " Role: " + user.getRole())
                        .build());
            }
            case "READING" -> {
                String id = item.getSyncId();
                String dutyId = (String) p.get("dutyId");
                String prodType = (String) p.get("productType");
                String pumpNum = (String) p.get("pumpNumber");
                BigDecimal startReading = new BigDecimal(p.get("startReading") != null ? p.get("startReading").toString() : "0");
                BigDecimal endReading = new BigDecimal(p.get("endReading") != null ? p.get("endReading").toString() : "0");
                BigDecimal totalLiters = new BigDecimal(p.get("totalLiters") != null ? p.get("totalLiters").toString() : "0");
                BigDecimal rate = new BigDecimal(p.get("rate") != null ? p.get("rate").toString() : "0");
                BigDecimal totalAmount = new BigDecimal(p.get("totalAmount") != null ? p.get("totalAmount").toString() : "0");
                Boolean isFinalized = p.get("isFinalized") != null ? (Boolean) p.get("isFinalized") : false;

                FuelReading reading = fuelReadingRepository.findById(id).orElseGet(() -> FuelReading.builder().id(id).build());
                reading.setDutyId(dutyId);
                reading.setProductType(ProductType.valueOf(prodType));
                reading.setPumpNumber(pumpNum != null ? pumpNum : "P1");
                reading.setStartReading(startReading);
                reading.setEndReading(endReading);
                reading.setTotalLiters(totalLiters);
                reading.setRate(rate);
                reading.setTotalAmount(totalAmount);
                reading.setFinalized(isFinalized);
                if (isFinalized && reading.getFinalizedAt() == null) {
                    reading.setFinalizedAt(LocalDateTime.now());
                }
                fuelReadingRepository.save(reading);
            }
            case "PAYMENT_REQUEST" -> {
                if (!paymentRequestRepository.existsById(item.getSyncId())) {
                    PaymentRequest req = PaymentRequest.builder()
                            .id(item.getSyncId())
                            .customerId((String) p.get("customerId"))
                            .customerName((String) p.get("customerName"))
                            .requestedAmount(new BigDecimal(p.get("requestedAmount").toString()))
                            .message((String) p.get("message"))
                            .sentByAdminId((String) p.get("sentByAdminId"))
                            .status("PENDING")
                            .sentAt(LocalDateTime.now())
                            .build();
                    paymentRequestRepository.save(req);
                }
            }
        }
    }

    public Map<String, Object> getCloudStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("usersCount", userRepository.count());
        status.put("customersCount", customerRepository.count());
        status.put("dutyShiftsCount", dutyShiftRepository.count());
        status.put("fuelReadingsCount", fuelReadingRepository.count());
        status.put("creditEntriesCount", creditEntryRepository.count());
        status.put("paymentEntriesCount", paymentEntryRepository.count());
        status.put("dutyClosingsCount", dutyClosingRepository.count());
        status.put("paymentRequestsCount", paymentRequestRepository.count());
        status.put("auditLogsCount", auditLogRepository.count());
        status.put("cloudConnected", true);
        status.put("serverTime", LocalDateTime.now().toString());
        return status;
    }

    public Map<String, Object> getAllCloudData() {
        Map<String, Object> allData = new HashMap<>();
        allData.put("users", userRepository.findAll());
        allData.put("customers", customerRepository.findAll());
        allData.put("dutyShifts", dutyShiftRepository.findAll());
        allData.put("fuelReadings", fuelReadingRepository.findAll());
        allData.put("creditEntries", creditEntryRepository.findAll());
        allData.put("paymentEntries", paymentEntryRepository.findAll());
        allData.put("dutyClosings", dutyClosingRepository.findAll());
        allData.put("paymentRequests", paymentRequestRepository.findAll());
        return allData;
    }

    @org.springframework.transaction.annotation.Transactional
    public void clearAllCustomerData() {
        log.warn("Clearing all customer records, customer users, and credit/payment entries from backend");
        creditEntryRepository.deleteAll();
        paymentEntryRepository.deleteAll();
        paymentRequestRepository.deleteAll();
        customerRepository.deleteAll();
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CUSTOMER)
                .forEach(userRepository::delete);
    }

    @org.springframework.transaction.annotation.Transactional
    public void resetDatabaseKeepUsers() {
        log.warn("Wiping entire database for fresh start while keeping staff/admin user logins");
        creditEntryRepository.deleteAll();
        paymentEntryRepository.deleteAll();
        paymentRequestRepository.deleteAll();
        fuelReadingRepository.deleteAll();
        dutyClosingRepository.deleteAll();
        dutyShiftRepository.deleteAll();
        customerRepository.deleteAll();
        auditLogRepository.deleteAll();
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.CUSTOMER)
                .forEach(userRepository::delete);
    }
}
