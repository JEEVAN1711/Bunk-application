package com.bunk.management.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "duty_shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DutyShift {

    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String shiftNumber;

    @Column(nullable = false)
    private String cashierId;

    private String cashierName;

    private String supportCashierId;

    private String supportCashierName;

    @Column(nullable = false)
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @Column(nullable = false)
    private String status; // ACTIVE, CLOSED

    private String notes;
}
