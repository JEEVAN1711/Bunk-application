package com.bunk.management.repository;

import com.bunk.management.entity.CreditEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditEntryRepository extends JpaRepository<CreditEntry, String> {
    List<CreditEntry> findByCustomerId(String customerId);
    List<CreditEntry> findByDutyId(String dutyId);
}
