package com.iflow.agent.repository;

import com.iflow.agent.entity.AiAgent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * AI Agent Repository
 */
@Repository
public interface AiAgentRepository extends JpaRepository<AiAgent, Long> {

    /**
     * 根据类型查找 Agent
     */
    List<AiAgent> findByType(String type);

    /**
     * 根据状态查找 Agent
     */
    List<AiAgent> findByStatus(String status);

    /**
     * 根据类型和状态查找 Agent
     */
    List<AiAgent> findByTypeAndStatus(String type, String status);

    /**
     * 查找所有活跃的 Agent
     */
    List<AiAgent> findByStatusOrderByCreatedAtDesc(String status);

    /**
     * 根据名称查找 Agent
     */
    Optional<AiAgent> findByName(String name);

    /**
     * 检查特定类型的 Agent 是否已注册
     */
    boolean existsByTypeAndCliPath(String type, String cliPath);

    /**
     * 搜索 Agent (按名称或类型)
     */
    @Query("SELECT a FROM AiAgent a WHERE LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(a.type) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<AiAgent> searchAgents(@Param("keyword") String keyword);
}
