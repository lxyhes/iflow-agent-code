package com.iflow.agent.domain.document.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

/**
 * 文档版本实体
 */
@Entity
@Table(name = "document_versions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVersion {

    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "version_id")
    private String versionId;

    @Column(name = "content", length = 10000)
    private String content;

    @Column(name = "change_description")
    private String changeDescription;

    @Column(name = "author")
    private String author;

    @Column(name = "line_count")
    private Integer lineCount;

    @Column(name = "char_count")
    private Integer charCount;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "is_current")
    @Builder.Default
    private Boolean isCurrent = false;

    @Column(name = "tags")
    private String tags;
}
