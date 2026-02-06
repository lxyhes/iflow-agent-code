package com.iflow.agent.domain.interview.repository;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, String> {

    List<InterviewSession> findByUserIdOrderByCreatedAtDesc(String userId);
}
