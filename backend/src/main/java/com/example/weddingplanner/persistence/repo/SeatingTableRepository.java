package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.SeatingTableEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatingTableRepository extends JpaRepository<SeatingTableEntity, String> {
    List<SeatingTableEntity> findAllByOrderByNameAsc();
    void deleteByIdNotIn(List<String> ids);
}
