package com.iflow.agent.controller;

import com.iflow.agent.dto.ocr.OcrRequest;
import com.iflow.agent.dto.ocr.OcrResponse;
import com.iflow.agent.service.ocr.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * OCR API - 对应 Python 的 ocr.py
 */
@Slf4j
@RestController
@RequestMapping("/api/projects/{projectName}/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrService ocrService;

    /**
     * OCR 识别
     */
    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> recognize(
            @PathVariable String projectName,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "rapidocr") String technology,
            @RequestParam(defaultValue = "200") int dpi,
            @RequestParam(defaultValue = "true") boolean preprocess,
            @RequestParam(defaultValue = "true") boolean deskew,
            @RequestParam(defaultValue = "2200") int maxSide,
            @RequestParam(defaultValue = "") String pageRange,
            @RequestParam(defaultValue = "true") boolean returnImages,
            @RequestParam(defaultValue = "900") int previewMaxSide,
            @RequestParam(defaultValue = "1") int maxPreviewPages) {

        log.info("OCR识别: project={}, file={}", projectName, file.getOriginalFilename());

        try {
            OcrRequest request = new OcrRequest();
            request.setTechnology(technology);
            request.setDpi(dpi);
            request.setPreprocess(preprocess);
            request.setDeskew(deskew);
            request.setMaxSide(maxSide);
            request.setPageRange(pageRange);
            request.setReturnImages(returnImages);
            request.setPreviewMaxSide(previewMaxSide);
            request.setMaxPreviewPages(maxPreviewPages);

            OcrResponse result = ocrService.recognize(file, request, projectName);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", result
            ));

        } catch (IllegalArgumentException e) {
            log.error("OCR参数错误: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("OCR识别失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 获取预览图片
     */
    @GetMapping("/preview")
    public ResponseEntity<byte[]> getPreview(
            @PathVariable String projectName,
            @RequestParam String token,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "900") int maxSide) {

        log.info("获取预览: project={}, token={}, page={}", projectName, token, page);

        try {
            byte[] imageData = ocrService.getPreview(token, page, maxSide);

            if (imageData.length == 0) {
                // 返回空图片或错误提示
                return ResponseEntity.noContent().build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(imageData);

        } catch (IllegalArgumentException e) {
            log.error("预览错误: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 清除OCR缓存
     */
    @DeleteMapping("/cache")
    public ResponseEntity<Map<String, Object>> clearCache(@PathVariable String projectName) {
        log.info("清除OCR缓存: project={}", projectName);

        int count = ocrService.clearCache();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "已清除 " + count + " 条缓存数据"
        ));
    }
}
