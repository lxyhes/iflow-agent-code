package com.iflow.agent.domain.workflow.repository;

import com.iflow.agent.domain.workflow.entity.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 工作流仓储
 */
@Repository
public interface WorkflowRepository extends JpaRepository<Workflow, String> {

    List<Workflow> findByUserIdOrderByCreatedAtDesc(String userId);
}
