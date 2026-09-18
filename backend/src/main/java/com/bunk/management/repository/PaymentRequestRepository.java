package com.bunk.management.repository;

import com.bunk.management.entity.PaymentRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRequestRepository extends MongoRepository<PaymentRequest, String> {
    List<PaymentRequest> findByCustomerId(String customerId);
}
