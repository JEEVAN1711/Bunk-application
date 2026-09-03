package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "credit_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditEntry {

    @Id
    private String id; // Client-generated syncId UUID

    @Column(nullable = false)
    private String customerId;

    private String customerName;

    private String customerPhone;

    @Column(nullable = false)
    private String dutyId;

    @Column(nullable = false)
    private String cashierId;

    private String cashierName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType productType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal liters;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal ratePerLiter;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    private String vehicleNumber;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, VOIDED
}
