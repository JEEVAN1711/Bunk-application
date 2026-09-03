package com.bunk.management.repository;

import com.bunk.management.entity.DutyClosing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DutyClosingRepository extends JpaRepository<DutyClosing, String> {
    Optional<DutyClosing> findByDutyId(String dutyId);
}
