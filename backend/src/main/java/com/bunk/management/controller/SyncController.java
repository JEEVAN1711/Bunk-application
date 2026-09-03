package com.bunk.management.controller;

import com.bunk.management.dto.SyncBatchRequest;
import com.bunk.management.dto.SyncBatchResponse;
import com.bunk.management.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/batch")
    public ResponseEntity<SyncBatchResponse> handleBatchSync(@RequestBody SyncBatchRequest request) {
        SyncBatchResponse response = syncService.processBatch(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getCloudStatus() {
        return ResponseEntity.ok(syncService.getCloudStatus());
    }

    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllCloudData() {
        return ResponseEntity.ok(syncService.getAllCloudData());
    }

    @DeleteMapping("/customers/all")
    public ResponseEntity<Map<String, Object>> clearAllCustomers() {
        syncService.clearAllCustomerData();
        return ResponseEntity.ok(Map.of("success", true, "message", "All customer records cleared from backend"));
    }

    @PostMapping("/customers/clear")
    public ResponseEntity<Map<String, Object>> postClearAllCustomers() {
        syncService.clearAllCustomerData();
        return ResponseEntity.ok(Map.of("success", true, "message", "All customer records cleared from backend"));
    }

    @PostMapping("/reset-database-keep-users")
    public ResponseEntity<Map<String, Object>> resetDatabaseKeepUsers() {
        syncService.resetDatabaseKeepUsers();
        return ResponseEntity.ok(Map.of("success", true, "message", "Database reset complete. Staff and Admin user logins preserved."));
    }

    @DeleteMapping("/database/reset")
    public ResponseEntity<Map<String, Object>> deleteDatabaseKeepUsers() {
        syncService.resetDatabaseKeepUsers();
        return ResponseEntity.ok(Map.of("success", true, "message", "Database reset complete. Staff and Admin user logins preserved."));
    }
}
