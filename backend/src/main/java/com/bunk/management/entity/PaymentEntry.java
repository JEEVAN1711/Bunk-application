package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "payment_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentEntry {

    @Id
    private String id; // Client-generated syncId UUID

    private String customerId;

    private String customerName;

    private String dutyId;

    private String cashierId;

    private String cashierName;

    private BigDecimal amount;

    private PaymentMethod paymentMethod;

    private String referenceNo;

    private LocalDateTime timestamp;

    private String notes;
}
