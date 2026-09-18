package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "duty_closings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DutyClosing {

    @Id
    private String id;

    private String dutyId;

    private String shiftNumber;

    private String cashierId;

    private String cashierName;

    private String closedByAdminId;

    private String closedByAdminName;

    private BigDecimal grossFuelSalesAmount;

    private BigDecimal creditGivenAmount;

    private BigDecimal creditPaymentsCollected;

    private BigDecimal expectedCashBalance;

    private BigDecimal actualCashInHand;

    private BigDecimal differenceAmount;

    private ClosingStatus closingStatus;

    private String notes;
    private Object denominations;
    private Object tankStock;

    private LocalDateTime closedAt;

    @Builder.Default
    private boolean isLocked = true;
}
