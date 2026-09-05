package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "expense_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseEntry {

    @Id
    private String id; // Client UUID syncId

    @Column(nullable = false)
    private String dutyId;

    @Column(nullable = false)
    private String cashierId;

    private String cashierName;

    @Column(nullable = false)
    private String title;

    private String category; // FOOD_BEVERAGES, GENERATOR_FUEL, CLEANING_MAINTENANCE, STATIONERY, TRANSPORT, OTHER

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
