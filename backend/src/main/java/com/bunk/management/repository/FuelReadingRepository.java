package com.bunk.management.repository;

import com.bunk.management.entity.FuelReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FuelReadingRepository extends JpaRepository<FuelReading, String> {
    List<FuelReading> findByDutyId(String dutyId);
}
