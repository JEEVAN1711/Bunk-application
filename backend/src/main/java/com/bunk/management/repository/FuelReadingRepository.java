package com.bunk.management.repository;

import com.bunk.management.entity.FuelReading;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuelReadingRepository extends MongoRepository<FuelReading, String> {
    List<FuelReading> findByDutyId(String dutyId);
}
