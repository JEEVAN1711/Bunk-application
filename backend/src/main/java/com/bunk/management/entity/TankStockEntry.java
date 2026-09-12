package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "tank_stocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TankStockEntry {

    @Id
    private String id; // e.g. stock-2026-09-05-day or client UUID

    private String date;

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

    private LocalDateTime timestamp;
}
