package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRequest {

    @Id
    private String id;

    @Column(nullable = false)
    private String customerId;

    private String customerName;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal requestedAmount;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false)
    private String sentByAdminId;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SETTLED, CANCELLED

    @Column(nullable = false)
    private LocalDateTime sentAt;
}
