package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    private String id;

    private String name;

    private String phoneNumber;

    private String photoUrl;

    @Builder.Default
    private BigDecimal totalCredit = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalPaid = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;
}
