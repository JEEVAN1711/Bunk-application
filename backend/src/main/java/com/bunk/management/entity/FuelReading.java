package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "fuel_readings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelReading {

    @Id
    private String id;

    private String dutyId;

    private ProductType productType;

    private String pumpNumber;

    private BigDecimal startReading;

    private BigDecimal endReading;

    private BigDecimal totalLiters;

    private BigDecimal rate;

    private BigDecimal totalAmount;

    private boolean isFinalized;

    private LocalDateTime finalizedAt;
}
