package com.iflow.agent.controller;

import com.iflow.agent.entity.ImageGeneration;
import com.iflow.agent.entity.ImageTask;
import com.iflow.agent.service.image.ImageGenerationService;
import com.iflow.agent.service.image.ImageRecognitionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

/**
 * 图像生成与处理控制器
 */
@RestController
@RequestMapping("/api/image")
@RequiredArgsConstructor
@Slf4j
public class ImageController {

    private final ImageGenerationService generationService;
    private final ImageRecognitionService recognitionService;

    /**
     * 文生图
     */
    @PostMapping("/generate/text-to-image")
    public ResponseEntity<?> generateTextToImage(
            @RequestBody Map<String, Object> request) {
        try {
            String prompt = (String) request.get("prompt");
            String negativePrompt = (String) request.get("negative_prompt");
            @SuppressWarnings("unchecked")
            Map<String, Object> config = (Map<String, Object>) request.get("config");
            Long userId = request.get("userId") != null ? 
                Long.valueOf(request.get("userId").toString()) : null;

            if (prompt == null || prompt.isEmpty()) {
                return ResponseEntity.badRequest().body("提示词不能为空");
            }

            ImageGeneration result = generationService.generateTextToImage(
                prompt, negativePrompt, config, userId);

            return ResponseEntity.ok(Map.of(
                "id", result.getId(),
                "status", result.getStatus(),
                "message", "图像生成已启动"
            ));

        } catch (Exception e) {
            log.error("文生图失败", e);
            return ResponseEntity.internalServerError().body("文生图失败：" + e.getMessage());
        }
    }

    /**
     * 图生图
     */
    @PostMapping("/generate/image-to-image")
    public ResponseEntity<?> generateImageToImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("prompt") String prompt,
            @RequestParam(required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            ImageGeneration result = generationService.generateImageToImage(
                file, prompt, null, userId);

            return ResponseEntity.ok(Map.of(
                "id", result.getId(),
                "status", result.getStatus(),
                "message", "图生图已启动"
            ));

        } catch (Exception e) {
            log.error("图生图失败", e);
            return ResponseEntity.internalServerError().body("图生图失败：" + e.getMessage());
        }
    }

    /**
     * 生成变体
     */
    @PostMapping("/generate/variation")
    public ResponseEntity<?> generateVariation(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            ImageGeneration result = generationService.generateVariation(file, null, userId);

            return ResponseEntity.ok(Map.of(
                "id", result.getId(),
                "status", result.getStatus(),
                "message", "变体生成已启动"
            ));

        } catch (Exception e) {
            log.error("生成变体失败", e);
            return ResponseEntity.internalServerError().body("生成变体失败：" + e.getMessage());
        }
    }

    /**
     * 图像编辑
     */
    @PostMapping("/edit")
    public ResponseEntity<?> editImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("mask") MultipartFile mask,
            @RequestParam("prompt") String prompt,
            @RequestParam(required = false) Long userId) {
        try {
            if (file.isEmpty() || mask.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            ImageGeneration result = generationService.editImage(
                file, mask, prompt, null, userId);

            return ResponseEntity.ok(Map.of(
                "id", result.getId(),
                "status", result.getStatus(),
                "message", "图像编辑已启动"
            ));

        } catch (Exception e) {
            log.error("图像编辑失败", e);
            return ResponseEntity.internalServerError().body("图像编辑失败：" + e.getMessage());
        }
    }

    /**
     * 获取生成历史
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            List<ImageGeneration> history = generationService.getHistory(userId, limit);
            return ResponseEntity.ok(Map.of(
                "generations", history,
                "total", history.size()
            ));
        } catch (Exception e) {
            log.error("获取历史失败", e);
            return ResponseEntity.internalServerError().body("获取历史失败：" + e.getMessage());
        }
    }

    /**
     * 获取支持的模型
     */
    @GetMapping("/models")
    public ResponseEntity<?> getSupportedModels() {
        return ResponseEntity.ok(Map.of(
            "models", generationService.getSupportedModels()
        ));
    }

    /**
     * 图像识别
     */
    @PostMapping("/recognize")
    public ResponseEntity<?> recognizeImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            ImageTask task = recognitionService.recognizeImage(file, userId);

            return ResponseEntity.ok(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "message", "图像识别已启动"
            ));

        } catch (Exception e) {
            log.error("图像识别失败", e);
            return ResponseEntity.internalServerError().body("图像识别失败：" + e.getMessage());
        }
    }

    /**
     * OCR 文字识别
     */
    @PostMapping("/ocr")
    public ResponseEntity<?> recognizeText(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            ImageTask task = recognitionService.recognizeText(file, userId);

            return ResponseEntity.ok(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "message", "OCR 识别已启动"
            ));

        } catch (Exception e) {
            log.error("OCR 识别失败", e);
            return ResponseEntity.internalServerError().body("OCR 识别失败：" + e.getMessage());
        }
    }

    /**
     * UI 转代码
     */
    @PostMapping("/ui-to-code")
    public ResponseEntity<?> uiToCode(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            ImageTask task = recognitionService.uiToCode(file, userId);

            return ResponseEntity.ok(Map.of(
                "taskId", task.getId(),
                "status", task.getStatus(),
                "message", "UI 转代码已启动"
            ));

        } catch (Exception e) {
            log.error("UI 转代码失败", e);
            return ResponseEntity.internalServerError().body("UI 转代码失败：" + e.getMessage());
        }
    }

    /**
     * 获取任务结果
     */
    @GetMapping("/task/{taskId}")
    public ResponseEntity<?> getTaskResult(@PathVariable Long taskId) {
        try {
            ImageTask task = recognitionService.getTaskStatus(taskId);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            log.error("获取任务结果失败", e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 下载生成的图片
     */
    @GetMapping("/download/{path}")
    public ResponseEntity<?> downloadImage(@PathVariable String path) {
        try {
            java.nio.file.Path filePath = Paths.get(path);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] content = Files.readAllBytes(filePath);
            String contentType = Files.probeContentType(filePath);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType != null ? contentType : "image/png"));
            headers.setContentDispositionFormData("attachment", filePath.getFileName().toString());

            return new ResponseEntity<>(content, headers, HttpStatus.OK);

        } catch (IOException e) {
            log.error("下载图片失败", e);
            return ResponseEntity.internalServerError().body("下载图片失败：" + e.getMessage());
        }
    }
}
