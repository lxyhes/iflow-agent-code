package com.iflow.agent.domain.interview.repository;

import com.iflow.agent.domain.interview.entity.PracticeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 练习会话仓储
 */
@Repository
public interface PracticeSessionRepository extends JpaRepository<PracticeSession, String> {

    List<PracticeSession> findByUserIdOrderByCreatedAtDesc(String userId);
}
