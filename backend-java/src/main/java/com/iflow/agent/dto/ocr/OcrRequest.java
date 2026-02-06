package com.iflow.agent.dto.ocr;

import lombok.Data;

/**
 * OCR 识别请求 DTO
 */
@Data
public class OcrRequest {
    private String technology = "rapidocr";
    private Integer dpi = 200;
    private Boolean preprocess = true;
    private Boolean deskew = true;
    private Integer maxSide = 2200;
    private String pageRange = "";
    private Boolean returnImages = true;
    private Integer previewMaxSide = 900;
    private Integer maxPreviewPages = 1;
}
