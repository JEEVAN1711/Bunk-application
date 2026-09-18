package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "expense_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseEntry {

    @Id
    private String id; // Client UUID syncId

    private String dutyId;

    private String cashierId;

    private String cashierName;

    private String title;

    private String category; // FOOD_BEVERAGES, GENERATOR_FUEL, CLEANING_MAINTENANCE, STATIONERY, TRANSPORT, OTHER

    private BigDecimal amount;

    private String notes;

    private LocalDateTime timestamp;
}
