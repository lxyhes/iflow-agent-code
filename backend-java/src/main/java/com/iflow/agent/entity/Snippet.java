package com.iflow.agent.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 代码片段实体
 */
@Entity
@Table(name = "snippets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Snippet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String language;

    private String category;

    @ElementCollection
    @CollectionTable(name = "snippet_tags", joinColumns = @JoinColumn(name = "snippet_id"))
    @Column(name = "tag")
    private List<String> tags;

    private String description;

    private Integer usageCount;

    private Boolean isPublic;

    private String author;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
