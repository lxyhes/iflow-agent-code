package com.iflow.agent.domain.resume.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 工作经历实体 - 对应 Python 的 resume_work_experience 表
 */
@Entity
@Table(name = "resume_work_experience")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkExperience {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Column(name = "company", nullable = false)
    private String company;

    @Column(name = "position", nullable = false)
    private String position;

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;

    @Column(name = "is_current")
    @Builder.Default
    private Boolean isCurrent = false;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "achievements", length = 2000)
    @Convert(converter = com.iflow.agent.domain.resume.converter.StringListConverter.class)
    private java.util.List<String> achievements;

    @Column(name = "sort_order")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonProperty("sort_order")
    private Integer sortOrder = 0;
}
