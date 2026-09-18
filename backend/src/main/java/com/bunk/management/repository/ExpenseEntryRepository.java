package com.bunk.management.repository;

import com.bunk.management.entity.ExpenseEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseEntryRepository extends MongoRepository<ExpenseEntry, String> {
    List<ExpenseEntry> findByDutyId(String dutyId);
}
