package com.bunk.management.repository;

import com.bunk.management.entity.TankStockEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TankStockEntryRepository extends JpaRepository<TankStockEntry, String> {
    List<TankStockEntry> findByDate(String date);
}
