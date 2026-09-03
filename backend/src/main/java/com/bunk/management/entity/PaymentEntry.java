package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentEntry {

    @Id
    private String id; // Client-generated syncId UUID

    @Column(nullable = false)
    private String customerId;

    private String customerName;

    @Column(nullable = false)
    private String dutyId;

    @Column(nullable = false)
    private String cashierId;

    private String cashierName;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    private String referenceNo;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private String notes;
}
