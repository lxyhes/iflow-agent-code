package com.iflow.agent.domain.project.repository;

import com.iflow.agent.domain.project.entity.ProjectSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 项目会话仓储
 */
@Repository
public interface ProjectSessionRepository extends JpaRepository<ProjectSession, String> {

    List<ProjectSession> findByProjectNameOrderByUpdatedAtDesc(String projectName);

    long countByProjectName(String projectName);
}
