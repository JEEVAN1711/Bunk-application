package com.bunk.management.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class SseService {

    // Emitter timeout: 30 minutes (reconnects automatically if disconnected)
    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Register a new client device for Server-Sent Events
     */
    public SseEmitter subscribe(String clientId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        emitters.add(emitter);

        log.info("Client connected to Realtime SSE stream: clientId={}, totalClients={}", clientId, emitters.size());

        emitter.onCompletion(() -> {
            emitters.remove(emitter);
            log.info("SSE client completed: clientId={}, remainingClients={}", clientId, emitters.size());
        });

        emitter.onTimeout(() -> {
            emitters.remove(emitter);
            log.info("SSE client timed out: clientId={}, remainingClients={}", clientId, emitters.size());
        });

        emitter.onError(e -> {
            emitters.remove(emitter);
            log.warn("SSE client error: clientId={}, error={}", clientId, e.getMessage());
        });

        // Send immediate handshake confirmation
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of(
                            "status", "CONNECTED",
                            "clientId", clientId != null ? clientId : "anonymous",
                            "timestamp", System.currentTimeMillis()
                    )));
        } catch (IOException e) {
            log.error("Failed to send SSE initial greeting to client: {}", clientId, e);
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Broadcast an event and payload to all connected devices in real time
     */
    public void broadcast(String eventName, Object data) {
        if (emitters.isEmpty()) {
            log.debug("No active SSE clients to broadcast event: {}", eventName);
            return;
        }

        log.info("Broadcasting realtime event: '{}' to {} connected device(s)", eventName, emitters.size());
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (Exception e) {
                log.warn("Error sending SSE to client, removing emitter: {}", e.getMessage());
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
            log.info("Pruned {} inactive SSE client(s). Active clients: {}", deadEmitters.size(), emitters.size());
        }
    }

    /**
     * Heartbeat ping every 15 seconds to prevent browser/proxy timeouts
     */
    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        if (emitters.isEmpty()) {
            return;
        }

        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("PING")
                        .data(Map.of("timestamp", System.currentTimeMillis())));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
        }
    }

    public int getConnectedCount() {
        return emitters.size();
    }
}
