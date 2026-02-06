package com.iflow.agent.dto.rag;

import lombok.Data;

/**
 * RAG 索引请求 DTO
 */
@Data
public class RagIndexRequest {
    private Boolean forceReindex = false;
}
