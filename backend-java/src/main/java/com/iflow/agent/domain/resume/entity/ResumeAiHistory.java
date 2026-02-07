package com.iflow.agent.domain.resume.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * AI生成记录实体 - 存储AI分析和优化的历史记录
 */
@Entity
@Table(name = "resume_ai_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeAiHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resume_id", nullable = false)
    private String resumeId;

    @Column(name = "type", nullable = false)
    private String type; // "analyze" 或 "rewrite"

    @Column(name = "ai_response", columnDefinition = "TEXT")
    private String aiResponse;

    @Column(name = "parsed_data", columnDefinition = "TEXT")
    private String parsedData; // JSON 格式的解析后数据

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "model", nullable = false)
    private String model; // 使用的 AI 模型

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}