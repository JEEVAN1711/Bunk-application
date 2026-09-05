package com.bunk.management.repository;

import com.bunk.management.entity.ExpenseEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseEntryRepository extends JpaRepository<ExpenseEntry, String> {
    List<ExpenseEntry> findByDutyId(String dutyId);
}
