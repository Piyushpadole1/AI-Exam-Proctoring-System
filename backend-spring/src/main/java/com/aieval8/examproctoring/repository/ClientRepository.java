package com.aieval8.examproctoring.repository;

import com.aieval8.examproctoring.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    Optional<Client> findByCode(String code);
    Optional<Client> findByName(String name);
    boolean existsByCode(String code);
}
