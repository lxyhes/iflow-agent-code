package com.iflow.agent.repository;

import com.iflow.agent.entity.Snippet;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SnippetRepository extends JpaRepository<Snippet, Long> {

    List<Snippet> findByCategory(String category);

    List<Snippet> findByLanguage(String language);

    List<Snippet> findByTagsContaining(String tag);

    List<Snippet> findByTitleContainingIgnoreCase(String keyword);

    List<Snippet> findByOrderByUsageCountDesc(Pageable pageable);

    List<Snippet> findByOrderByCreatedAtDesc(Pageable pageable);
}
