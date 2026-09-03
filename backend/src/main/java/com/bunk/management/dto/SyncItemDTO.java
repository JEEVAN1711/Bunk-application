package com.bunk.management.dto;

import lombok.Data;
import java.util.Map;

@Data
public class SyncItemDTO {
    private String syncId;
    private String entityType; // CREDIT, PAYMENT, READING, DUTY_CLOSING, CUSTOMER, DUTY, PAYMENT_REQUEST, USER
    private String action; // CREATE, UPDATE, DELETE
    private String timestamp;
    private Map<String, Object> payload;
}
