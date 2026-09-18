package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    private String id;

    private String entityName;

    private String entityId;

    private String action; // CREATE, UPDATE, VOID, CLOSE

    private String performedBy;

    private LocalDateTime timestamp;

    private String payloadSnapshot;
}
