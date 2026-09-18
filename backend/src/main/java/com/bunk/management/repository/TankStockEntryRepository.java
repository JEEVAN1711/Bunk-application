package com.bunk.management.repository;

import com.bunk.management.entity.TankStockEntry;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TankStockEntryRepository extends MongoRepository<TankStockEntry, String> {
    List<TankStockEntry> findByDate(String date);
}
