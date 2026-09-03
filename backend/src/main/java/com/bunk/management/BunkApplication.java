package com.bunk.management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class BunkApplication {

    public static void main(String[] args) {
        SpringApplication.run(BunkApplication.class, args);
    }
}
