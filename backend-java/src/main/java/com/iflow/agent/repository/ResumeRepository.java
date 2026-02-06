package com.iflow.agent.repository;

import com.iflow.agent.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {

    List<Resume> findByUserId(String userId);

    Optional<Resume> findByIdAndUserId(Long id, String userId);

    void deleteByIdAndUserId(Long id, String userId);
}
