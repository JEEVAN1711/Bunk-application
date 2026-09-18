package com.bunk.management.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    private String username;

    private String passwordHash;

    private String fullName;

    private String phone;

    private Role role;

    private String photoUrl;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime createdAt;
}
