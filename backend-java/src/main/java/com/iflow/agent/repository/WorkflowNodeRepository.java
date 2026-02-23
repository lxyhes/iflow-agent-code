package com.iflow.agent.repository;

import com.iflow.agent.entity.WorkflowNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 工作流节点 Repository
 */
@Repository
public interface WorkflowNodeRepository extends JpaRepository<WorkflowNode, Long> {

    /**
     * 根据工作流 ID 查找节点
     */
    List<WorkflowNode> findByWorkflowIdOrderByCreatedAtAsc(Long workflowId);

    /**
     * 根据工作流 ID 和节点类型查找
     */
    List<WorkflowNode> findByWorkflowIdAndNodeType(Long workflowId, String nodeType);

    /**
     * 删除工作流的所有节点
     */
    void deleteByWorkflowId(Long workflowId);

    /**
     * 统计工作流的节点数
     */
    long countByWorkflowId(Long workflowId);
}
