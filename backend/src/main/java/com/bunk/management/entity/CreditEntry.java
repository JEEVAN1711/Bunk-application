package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "credit_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreditEntry {

    @Id
    private String id; // Client-generated syncId UUID

    private String customerId;

    private String customerName;

    private String customerPhone;

    private String dutyId;

    private String cashierId;

    private String cashierName;

    private ProductType productType;

    private BigDecimal liters;

    private BigDecimal ratePerLiter;

    private BigDecimal totalAmount;

    private String vehicleNumber;

    private LocalDateTime timestamp;

    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, VOIDED
}
