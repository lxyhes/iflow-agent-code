package com.iflow.agent.repository;

import com.iflow.agent.domain.interview.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, String> {

    List<Question> findBySessionId(String sessionId);

    List<Question> findBySessionIdAndCategory(String sessionId, String category);
}
