package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 项目健康快照实体类
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "project_health_snapshot")
public class ProjectHealthSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 项目 ID
     */
    @Column(name = "project_id", nullable = false)
    private Long projectId;

    /**
     * 代码质量评分 (0-100)
     */
    @Column(name = "code_quality_score")
    private Double codeQualityScore;

    /**
     * 测试覆盖率 (0-100)
     */
    @Column(name = "test_coverage")
    private Double testCoverage;

    /**
     * 技术债务 (小时)
     */
    @Column(name = "technical_debt")
    private Integer technicalDebt;

    /**
     * 依赖健康评分 (0-100)
     */
    @Column(name = "dependency_health_score")
    private Double dependencyHealthScore;

    /**
     * 问题列表 (JSON 数组)
     */
    @Column(name = "issues", columnDefinition = "TEXT")
    private String issues;

    /**
     * 改进建议 (JSON 数组)
     */
    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
