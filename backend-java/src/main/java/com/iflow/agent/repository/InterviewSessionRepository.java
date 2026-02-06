package com.iflow.agent.repository;

import com.iflow.agent.domain.interview.entity.InterviewSession;
import com.iflow.agent.domain.interview.enums.InterviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, String> {

    List<InterviewSession> findByUserId(String userId);

    List<InterviewSession> findByUserIdAndStatus(String userId, InterviewStatus status);
}
