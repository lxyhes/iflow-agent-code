package com.iflow.agent.domain.resume.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 项目经历实体 - 对应 Python 的 resume_projects 表
 */
@Entity
@Table(name = "resume_projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "technologies", length = 500)
    @Convert(converter = com.iflow.agent.domain.resume.converter.StringListConverter.class)
    private java.util.List<String> technologies;

    @Column(name = "role")
    private String role;

    @Column(name = "achievements", length = 2000)
    @Convert(converter = com.iflow.agent.domain.resume.converter.StringListConverter.class)
    private java.util.List<String> achievements;

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;
}
