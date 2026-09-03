package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "duty_closings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DutyClosing {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String dutyId;

    @Column(nullable = false)
    private String shiftNumber;

    @Column(nullable = false)
    private String cashierId;

    private String cashierName;

    @Column(nullable = false)
    private String closedByAdminId;

    private String closedByAdminName;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal grossFuelSalesAmount;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal creditGivenAmount;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal creditPaymentsCollected;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal expectedCashBalance;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal actualCashInHand;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal differenceAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClosingStatus closingStatus;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime closedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean isLocked = true;
}
