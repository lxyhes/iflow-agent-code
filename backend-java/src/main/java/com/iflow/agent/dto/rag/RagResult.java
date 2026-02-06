package com.iflow.agent.dto.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * RAG 检索结果项 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagResult {
    private String id;
    private String content;
    private Double similarity;
    private Map<String, Object> metadata;
}
