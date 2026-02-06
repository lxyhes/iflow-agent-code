package com.iflow.agent.domain.project.repository;

import com.iflow.agent.domain.project.entity.WorkspaceProject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 项目仓储
 */
@Repository
public interface ProjectRepository extends JpaRepository<WorkspaceProject, String> {

    Optional<WorkspaceProject> findByName(String name);

    List<WorkspaceProject> findByCreatedByOrderByUpdatedAtDesc(String createdBy);

    boolean existsByName(String name);
}
