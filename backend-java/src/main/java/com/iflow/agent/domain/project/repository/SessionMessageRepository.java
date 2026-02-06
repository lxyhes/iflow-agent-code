package com.iflow.agent.domain.project.repository;

import com.iflow.agent.domain.project.entity.SessionMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 会话消息仓储
 */
@Repository
public interface SessionMessageRepository extends JpaRepository<SessionMessage, String> {

    List<SessionMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    long countBySessionId(String sessionId);
}
