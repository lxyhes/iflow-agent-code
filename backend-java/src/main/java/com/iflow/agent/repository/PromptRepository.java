package com.iflow.agent.repository;

import com.iflow.agent.entity.Prompt;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, Long> {

    List<Prompt> findByCategory(String category);

    List<Prompt> findByTagsContaining(String tag);

    List<Prompt> findByTitleContainingIgnoreCase(String keyword);

    List<Prompt> findByOrderByUsageCountDesc(Pageable pageable);

    List<Prompt> findByOrderByCreatedAtDesc(Pageable pageable);
}
