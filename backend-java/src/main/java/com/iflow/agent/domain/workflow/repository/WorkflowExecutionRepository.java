package com.iflow.agent.domain.workflow.repository;

import com.iflow.agent.domain.workflow.entity.WorkflowExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 工作流执行仓储
 */
@Repository("domainWorkflowExecutionRepository")
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, String> {

    List<WorkflowExecution> findByWorkflowIdOrderByCreatedAtDesc(String workflowId);

    List<WorkflowExecution> findTop20ByOrderByCreatedAtDesc();
}
