package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "payment_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {

    @Id
    private String id;

    private String customerId;

    private String customerName;

    private BigDecimal requestedAmount;

    private String message;

    private String sentByAdminId;

    @Builder.Default
    private String status = "PENDING"; // PENDING, SETTLED, CANCELLED

    private LocalDateTime sentAt;
}
