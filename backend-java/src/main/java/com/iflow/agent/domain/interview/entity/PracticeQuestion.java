package com.iflow.agent.domain.interview.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.ArrayList;
import java.util.List;

/**
 * 练习问题实体
 */
@Entity
@Table(name = "practice_questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeQuestion {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private PracticeSession session;

    @Column(name = "question_index")
    private Integer questionIndex;

    @Column(name = "content", length = 2000)
    private String content;

    @Column(name = "category")
    private String category;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "expected_answer", length = 3000)
    private String expectedAnswer;

    @Column(name = "key_points")
    @ElementCollection
    @CollectionTable(name = "practice_question_key_points", joinColumns = @JoinColumn(name = "question_id"))
    private List<String> keyPoints = new ArrayList<>();

    @Column(name = "hints")
    @ElementCollection
    @CollectionTable(name = "practice_question_hints", joinColumns = @JoinColumn(name = "question_id"))
    private List<String> hints = new ArrayList<>();

    @Column(name = "time_limit")
    private Integer timeLimit; // 秒

    @Column(name = "score")
    private Integer score;
}
