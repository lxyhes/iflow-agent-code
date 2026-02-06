package com.iflow.agent.domain.interview.entity;

import com.iflow.agent.domain.interview.enums.InterviewStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 练习会话实体 - 对应 Python 的 PracticeSession
 */
@Entity
@Table(name = "practice_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeSession {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "mode")
    @Enumerated(EnumType.STRING)
    private PracticeMode mode;

    @Column(name = "difficulty")
    @Enumerated(EnumType.STRING)
    private PracticeDifficulty difficulty;

    @Column(name = "question_count")
    private Integer questionCount;

    @Column(name = "focus_areas")
    @ElementCollection
    @CollectionTable(name = "practice_session_focus_areas", joinColumns = @JoinColumn(name = "session_id"))
    private List<String> focusAreas = new ArrayList<>();

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InterviewStatus status = InterviewStatus.CREATED;

    @Column(name = "current_question_index")
    @Builder.Default
    private Integer currentQuestionIndex = 0;

    @Column(name = "total_score")
    @Builder.Default
    private Integer totalScore = 0;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PracticeQuestion> questions = new ArrayList<>();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PracticeAnswer> answers = new ArrayList<>();

    /**
     * 获取当前问题
     */
    public PracticeQuestion getCurrentQuestion() {
        if (questions == null || questions.isEmpty()) {
            return null;
        }
        if (currentQuestionIndex >= questions.size()) {
            return null;
        }
        return questions.get(currentQuestionIndex);
    }

    /**
     * 获取进度
     */
    public double getProgress() {
        if (questions == null || questions.isEmpty()) {
            return 0.0;
        }
        return (double) currentQuestionIndex / questions.size();
    }

    /**
     * 获取统计信息
     */
    public PracticeStats getStats() {
        int answeredCount = answers != null ? answers.size() : 0;
        int correctCount = answers != null ? (int) answers.stream()
                .filter(a -> a.getScore() != null && a.getScore() >= 70)
                .count() : 0;

        return PracticeStats.builder()
                .totalQuestions(questions != null ? questions.size() : 0)
                .answeredQuestions(answeredCount)
                .correctQuestions(correctCount)
                .accuracyRate(answeredCount > 0 ? (double) correctCount / answeredCount : 0)
                .averageScore(answers != null && !answers.isEmpty() ?
                        answers.stream().mapToInt(a -> a.getScore() != null ? a.getScore() : 0).average().orElse(0) : 0)
                .build();
    }

    /**
     * 进入下一题
     */
    public boolean nextQuestion() {
        if (questions == null || currentQuestionIndex >= questions.size() - 1) {
            return false;
        }
        currentQuestionIndex++;
        return true;
    }

    /**
     * 练习模式
     */
    public enum PracticeMode {
        SYSTEM_DESIGN("system_design", "系统设计"),
        CODING("coding", "编程题"),
        BEHAVIORAL("behavioral", "行为面试"),
        TECHNICAL("technical", "技术面试"),
        MIXED("mixed", "混合模式");

        private final String code;
        private final String name;

        PracticeMode(String code, String name) {
            this.code = code;
            this.name = name;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public static PracticeMode fromCode(String code) {
            for (PracticeMode mode : values()) {
                if (mode.code.equals(code)) {
                    return mode;
                }
            }
            return MIXED;
        }
    }

    /**
     * 练习难度
     */
    public enum PracticeDifficulty {
        BEGINNER("beginner", "初级", 1),
        INTERMEDIATE("intermediate", "中级", 2),
        ADVANCED("advanced", "高级", 3),
        EXPERT("expert", "专家", 4);

        private final String code;
        private final String name;
        private final int level;

        PracticeDifficulty(String code, String name, int level) {
            this.code = code;
            this.name = name;
            this.level = level;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public int getLevel() {
            return level;
        }

        public static PracticeDifficulty fromCode(String code) {
            for (PracticeDifficulty difficulty : values()) {
                if (difficulty.code.equals(code)) {
                    return difficulty;
                }
            }
            return INTERMEDIATE;
        }
    }

    /**
     * 练习统计
     */
    @Data
    @Builder
    public static class PracticeStats {
        private int totalQuestions;
        private int answeredQuestions;
        private int correctQuestions;
        private double accuracyRate;
        private double averageScore;
    }
}
