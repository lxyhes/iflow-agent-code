package com.iflow.agent.domain.resume.repository;

import com.iflow.agent.domain.resume.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, String> {

    List<Resume> findByUserIdOrderByUpdatedAtDesc(String userId);

    Optional<Resume> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);
}
