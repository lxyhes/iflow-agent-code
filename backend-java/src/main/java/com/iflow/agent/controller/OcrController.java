package com.iflow.agent.controller;

import com.iflow.agent.service.ocr.AliyunOcrService;
import com.iflow.agent.service.ocr.OcrResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final AliyunOcrService aliyunOcrService;

    @PostMapping("/general")
    public ResponseEntity<?> recognizeGeneral(@RequestParam("file") MultipartFile file) {
        if (!aliyunOcrService.isAvailable()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "OCR service not configured"));
        }

        try {
            byte[] imageBytes = file.getBytes();
            String result = aliyunOcrService.recognizeGeneral(imageBytes);

            if (result.startsWith("Error:")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", result));
            }

            return ResponseEntity.ok(Map.of(
                    "text", result,
                    "type", "general"
            ));
        } catch (Exception e) {
            log.error("OCR general recognition failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/table")
    public ResponseEntity<?> recognizeTable(@RequestParam("file") MultipartFile file) {
        if (!aliyunOcrService.isAvailable()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "OCR service not configured"));
        }

        try {
            byte[] imageBytes = file.getBytes();
            String result = aliyunOcrService.recognizeTable(imageBytes);

            if (result.startsWith("Error:")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", result));
            }

            return ResponseEntity.ok(Map.of(
                    "text", result,
                    "type", "table"
            ));
        } catch (Exception e) {
            log.error("OCR table recognition failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/document")
    public ResponseEntity<?> recognizeDocument(@RequestParam("file") MultipartFile file) {
        if (!aliyunOcrService.isAvailable()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "OCR service not configured"));
        }

        try {
            byte[] imageBytes = file.getBytes();
            String result = aliyunOcrService.recognizeDocument(imageBytes);

            if (result.startsWith("Error:")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", result));
            }

            return ResponseEntity.ok(Map.of(
                    "text", result,
                    "type", "document"
            ));
        } catch (Exception e) {
            log.error("OCR document recognition failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/handwriting")
    public ResponseEntity<?> recognizeHandwriting(@RequestParam("file") MultipartFile file) {
        if (!aliyunOcrService.isAvailable()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "OCR service not configured"));
        }

        try {
            byte[] imageBytes = file.getBytes();
            String result = aliyunOcrService.recognizeHandwriting(imageBytes);

            if (result.startsWith("Error:")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", result));
            }

            return ResponseEntity.ok(Map.of(
                    "text", result,
                    "type", "handwriting"
            ));
        } catch (Exception e) {
            log.error("OCR handwriting recognition failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/smart")
    public ResponseEntity<?> smartRecognize(@RequestParam("file") MultipartFile file) {
        if (!aliyunOcrService.isAvailable()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "OCR service not configured"));
        }

        try {
            byte[] imageBytes = file.getBytes();
            OcrResult result = aliyunOcrService.smartRecognize(imageBytes);

            if (!result.isSuccess()) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", result.getError()));
            }

            return ResponseEntity.ok(Map.of(
                    "text", result.getText(),
                    "type", result.getType()
            ));
        } catch (Exception e) {
            log.error("OCR smart recognition failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/base64")
    public ResponseEntity<?> recognizeBase64(@RequestBody Base64Request request) {
        if (!aliyunOcrService.isAvailable()) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "OCR service not configured"));
        }

        try {
            byte[] imageBytes = Base64.getDecoder().decode(request.getImage());
            String result = aliyunOcrService.recognizeGeneral(imageBytes);

            if (result.startsWith("Error:")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", result));
            }

            return ResponseEntity.ok(Map.of(
                    "text", result,
                    "type", "general"
            ));
        } catch (Exception e) {
            log.error("OCR base64 recognition failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "available", aliyunOcrService.isAvailable(),
                "service", "aliyun-ocr"
        ));
    }

    @Data
    public static class Base64Request {
        private String image;
    }
}
