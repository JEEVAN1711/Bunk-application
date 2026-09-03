package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fuel_readings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelReading {

    @Id
    private String id;

    @Column(nullable = false)
    private String dutyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType productType;

    @Column(nullable = false)
    private String pumpNumber;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal startReading;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal endReading;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalLiters;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal rate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private boolean isFinalized;

    private LocalDateTime finalizedAt;
}
