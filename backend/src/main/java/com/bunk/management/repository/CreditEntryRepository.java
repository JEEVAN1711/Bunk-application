package com.bunk.management.repository;

import com.bunk.management.entity.CreditEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CreditEntryRepository extends MongoRepository<CreditEntry, String> {
    List<CreditEntry> findByCustomerId(String customerId);
    List<CreditEntry> findByDutyId(String dutyId);
}
