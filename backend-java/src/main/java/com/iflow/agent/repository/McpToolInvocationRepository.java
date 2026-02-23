package com.iflow.agent.repository;

import com.iflow.agent.entity.McpToolInvocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * MCP 工具调用 Repository
 */
@Repository
public interface McpToolInvocationRepository extends JpaRepository<McpToolInvocation, Long> {

    /**
     * 根据服务器 ID 查找
     */
    List<McpToolInvocation> findByServerIdOrderByInvokedAtDesc(Long serverId);

    /**
     * 根据状态查找
     */
    List<McpToolInvocation> findByStatusOrderByInvokedAtDesc(String status);

    /**
     * 统计成功率
     */
    @Query("SELECT COUNT(t) FROM McpToolInvocation t WHERE t.serverId = :serverId AND t.status = 'success'")
    long countSuccessfulByServerId(@Param("serverId") Long serverId);
}
