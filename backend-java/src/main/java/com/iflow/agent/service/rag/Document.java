package com.iflow.agent.service.rag;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rag_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "collection_name", nullable = false)
    private String collectionName;

    @Column(name = "title")
    private String title;

    @Column(name = "content", length = 10000)
    private String content;

    @Column(name = "source")
    private String source;

    @ElementCollection
    @CollectionTable(name = "document_embeddings", joinColumns = @JoinColumn(name = "document_id"))
    @Column(name = "embedding_value")
    private List<Double> embedding;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
