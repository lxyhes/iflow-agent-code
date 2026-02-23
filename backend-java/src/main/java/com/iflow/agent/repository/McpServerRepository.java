package com.iflow.agent.repository;

import com.iflow.agent.entity.McpServer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * MCP 服务器 Repository
 */
@Repository
public interface McpServerRepository extends JpaRepository<McpServer, Long> {

    /**
     * 根据状态查找
     */
    List<McpServer> findByStatus(String status);

    /**
     * 根据类型查找
     */
    List<McpServer> findByTypeOrderByCreatedAtDesc(String type);

    /**
     * 搜索服务器
     */
    @Query("SELECT s FROM McpServer s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<McpServer> searchServers(@Param("keyword") String keyword);
}
