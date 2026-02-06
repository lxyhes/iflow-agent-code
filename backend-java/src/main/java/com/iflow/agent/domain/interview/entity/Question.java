package com.iflow.agent.domain.interview.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 面试问题
 */
@Entity
@Table(name = "interview_questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "content", length = 2000)
    private String content;

    @Column(name = "type")
    private String type;

    @Column(name = "difficulty")
    private Integer difficulty;

    @Column(name = "category")
    private String category;

    @Column(name = "expected_duration")
    private Integer expectedDuration;

    @ElementCollection
    @CollectionTable(name = "question_follow_ups", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "follow_up")
    private List<String> followUpQuestions;

    @ElementCollection
    @CollectionTable(name = "question_evaluation_criteria", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "criterion")
    private List<String> evaluationCriteria;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
