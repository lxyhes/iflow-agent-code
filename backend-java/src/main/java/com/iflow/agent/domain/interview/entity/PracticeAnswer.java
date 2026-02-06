package com.iflow.agent.domain.interview.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 练习回答实体
 */
@Entity
@Table(name = "practice_answers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeAnswer {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private PracticeSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private PracticeQuestion question;

    @Column(name = "question_index")
    private Integer questionIndex;

    @Column(name = "answer_content", length = 3000)
    private String answerContent;

    @Column(name = "duration")
    private Integer duration; // 回答用时（秒）

    @Column(name = "score")
    private Integer score;

    @Column(name = "evaluation", length = 2000)
    private String evaluation;

    @Column(name = "expected_points")
    @ElementCollection
    @CollectionTable(name = "practice_answer_expected_points", joinColumns = @JoinColumn(name = "answer_id"))
    private List<String> expectedPoints = new ArrayList<>();

    @Column(name = "detailed_feedback", length = 2000)
    private String detailedFeedback;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
