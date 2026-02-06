package com.iflow.agent.domain.interview.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 评估结果
 */
@Entity
@Table(name = "interview_evaluations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    @Column(name = "answer_id")
    private String answerId;

    @Column(name = "score")
    private Double score;

    @Column(name = "dimension")
    private String dimension;

    @Column(name = "feedback", length = 2000)
    private String feedback;

    @ElementCollection
    @CollectionTable(name = "evaluation_strengths", joinColumns = @JoinColumn(name = "evaluation_id"))
    @Column(name = "strength")
    private List<String> strengths;

    @ElementCollection
    @CollectionTable(name = "evaluation_weaknesses", joinColumns = @JoinColumn(name = "evaluation_id"))
    @Column(name = "weakness")
    private List<String> weaknesses;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
