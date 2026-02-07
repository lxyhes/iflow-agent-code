package com.iflow.agent.domain.resume.repository;

import com.iflow.agent.domain.resume.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, String> {

    List<Resume> findByUserIdOrderByUpdatedAtDesc(String userId);

    // 使用两次查询来避免 MultipleBagFetchException
    @Query("SELECT r FROM Resume r LEFT JOIN FETCH r.personalInfo LEFT JOIN FETCH r.workExperiences WHERE r.id = :id")
    Optional<Resume> findWithBasicRelationsById(String id);

    Optional<Resume> findByIdAndUserId(String id, String userId);

    void deleteByIdAndUserId(String id, String userId);
}
