package com.iflow.agent.dto.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * RAG 检索响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagRetrieveResponse {
    private Boolean success;
    private String query;
    private List<RagResult> results;
    private Integer count;
    private Integer totalFiltered;
    private Map<String, Object> filtersApplied;
}
