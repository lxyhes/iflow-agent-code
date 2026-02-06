package com.iflow.agent.repository;

import com.iflow.agent.domain.interview.entity.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationRepository extends JpaRepository<Evaluation, String> {

    List<Evaluation> findBySessionId(String sessionId);

    List<Evaluation> findByQuestionId(String questionId);
}
