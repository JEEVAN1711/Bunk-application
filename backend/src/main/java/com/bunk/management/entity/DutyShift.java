package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "duty_shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DutyShift {

    @Id
    private String id;

    private String shiftNumber;

    private String cashierId;

    private String cashierName;

    private String supportCashierId;

    private String supportCashierName;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private String status; // ACTIVE, CLOSED

    private String notes;
}
