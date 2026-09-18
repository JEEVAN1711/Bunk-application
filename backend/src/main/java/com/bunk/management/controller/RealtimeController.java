package com.bunk.management.controller;

import com.bunk.management.service.SseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/realtime")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class RealtimeController {

    private final SseService sseService;

    /**
     * Subscribe to real-time events stream from any device (Browser, Mobile, Tablet)
     */
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@RequestParam(required = false, defaultValue = "anonymous") String clientId) {
        return sseService.subscribe(clientId);
    }

    /**
     * Broadcast user login/logout/presence to all connected devices
     */
    @PostMapping("/presence")
    public ResponseEntity<Map<String, Object>> broadcastPresence(@RequestBody Map<String, Object> presenceData) {
        log.info("Received presence event: {}", presenceData);
        sseService.broadcast("PRESENCE_UPDATE", presenceData);
        return ResponseEntity.ok(Map.of("success", true, "message", "Presence broadcasted"));
    }

    /**
     * Get number of currently connected real-time devices
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getRealtimeInfo() {
        return ResponseEntity.ok(Map.of(
                "connectedDevices", sseService.getConnectedCount(),
                "timestamp", System.currentTimeMillis()
        ));
    }
}
