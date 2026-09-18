package com.bunk.management.repository;

import com.bunk.management.entity.DutyShift;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DutyShiftRepository extends MongoRepository<DutyShift, String> {
    Optional<DutyShift> findByShiftNumber(String shiftNumber);
    List<DutyShift> findByStatus(String status);
}
