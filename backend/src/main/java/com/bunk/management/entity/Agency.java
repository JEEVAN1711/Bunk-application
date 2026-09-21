package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "agencies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Agency {

    @Id
    private String id;

    private String code;

    private String name;

    private String ownerName;

    private String phone;

    private String address;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;
}
