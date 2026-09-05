package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tank_stocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TankStockEntry {

    @Id
    private String id; // e.g. stock-2026-09-05-day or client UUID

    @Column(nullable = false)
    private String date;

    @Column(nullable = false)
    private String period; // DAY_SHIFT_END, NIGHT_SHIFT_END, SHIFT_END

    private String shiftName;

    // MS (Petrol)
    private String msAtgDipLevel;
    private BigDecimal msAtgStock;
    private String msTankDipLevel;
    private BigDecimal msTankDipStock;

    // HSD (Diesel)
    private String hsdAtgDipLevel;
    private BigDecimal hsdAtgStock;
    private String hsdTankDipLevel;
    private BigDecimal hsdTankDipStock;

    private String recordedByAdminId;
    private String recordedByAdminName;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
