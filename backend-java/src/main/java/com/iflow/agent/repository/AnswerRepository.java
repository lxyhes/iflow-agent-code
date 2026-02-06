package com.iflow.agent.repository;

import com.iflow.agent.domain.interview.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, String> {

    List<Answer> findBySessionId(String sessionId);

    Optional<Answer> findByQuestionId(String questionId);
}
