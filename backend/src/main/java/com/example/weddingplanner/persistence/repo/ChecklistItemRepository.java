package com.example.weddingplanner.persistence.repo;

import com.example.weddingplanner.persistence.entity.ChecklistItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItemEntity, String> {
    List<ChecklistItemEntity> findAllByOrderByDoneAscDueDateAscTitleAsc();
}
