package com.bunk.management.repository;

import com.bunk.management.entity.PaymentEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentEntryRepository extends MongoRepository<PaymentEntry, String> {
    List<PaymentEntry> findByCustomerId(String customerId);
    List<PaymentEntry> findByDutyId(String dutyId);
}
