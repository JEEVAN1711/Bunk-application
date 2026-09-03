package com.bunk.management.repository;

import com.bunk.management.entity.PaymentEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentEntryRepository extends JpaRepository<PaymentEntry, String> {
    List<PaymentEntry> findByCustomerId(String customerId);
    List<PaymentEntry> findByDutyId(String dutyId);
}
