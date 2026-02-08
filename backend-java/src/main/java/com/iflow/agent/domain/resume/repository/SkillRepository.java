package com.iflow.agent.domain.resume.repository;

import com.iflow.agent.domain.resume.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillRepository extends JpaRepository<Skill, Long> {
    void deleteByIdAndResumeId(Long id, String resumeId);
}
