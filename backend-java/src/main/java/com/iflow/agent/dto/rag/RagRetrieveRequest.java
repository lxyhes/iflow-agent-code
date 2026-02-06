package com.iflow.agent.dto.rag;

import lombok.Data;

import java.util.List;

/**
 * RAG 检索请求 DTO
 */
@Data
public class RagRetrieveRequest {
    private String query;
    private Integer nResults = 5;
    private Double similarityThreshold = 0.0;
    private List<String> fileTypes;
    private List<String> languages;
    private Integer minChunkSize = 0;
    private Integer maxChunkSize = Integer.MAX_VALUE;
    private String sortBy = "similarity"; // similarity, date, size
}
