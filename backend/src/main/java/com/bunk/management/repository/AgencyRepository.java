package com.bunk.management.repository;

import com.bunk.management.entity.Agency;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AgencyRepository extends MongoRepository<Agency, String> {
    Optional<Agency> findByCode(String code);
}
