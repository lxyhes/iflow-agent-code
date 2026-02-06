package com.iflow.agent.dto.ocr;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * OCR 识别响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrResponse {
    private Boolean success;
    private String technology;
    private String text;
    private Integer totalPages;
    private Integer page;
    private Integer width;
    private Integer height;
    private Integer processedWidth;
    private Integer processedHeight;
    private List<Map<String, Object>> pages;
    private List<Map<String, Object>> blocks;
    private String previewUrl;
    private String previewToken;
}
