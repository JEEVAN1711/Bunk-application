package com.bunk.management.repository;

import com.bunk.management.entity.DutyClosing;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DutyClosingRepository extends MongoRepository<DutyClosing, String> {
    Optional<DutyClosing> findByDutyId(String dutyId);
}
