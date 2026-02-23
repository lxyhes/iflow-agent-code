package com.iflow.agent.service.image;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.entity.ImageTask;
import com.iflow.agent.repository.ImageTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * 图像识别服务
 * 支持图像描述、OCR、UI 转代码等功能
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImageRecognitionService {

    private final ImageTaskRepository taskRepository;
    private final ObjectMapper objectMapper;

    private static final String UPLOAD_DIR = "./storage/images/uploads";

    /**
     * 图像识别 (生成描述)
     */
    @Transactional
    public ImageTask recognizeImage(MultipartFile file, Long userId) {
        ImageTask task = createTask("recognize", file, userId);

        // 异步执行
        executeAsync(task.getId(), file);

        return task;
    }

    /**
     * OCR 文字识别
     */
    @Transactional
    public ImageTask recognizeText(MultipartFile file, Long userId) {
        ImageTask task = createTask("ocr", file, userId);

        // 异步执行
        executeAsync(task.getId(), file);

        return task;
    }

    /**
     * UI 转代码
     */
    @Transactional
    public ImageTask uiToCode(MultipartFile file, Long userId) {
        ImageTask task = createTask("ui-to-code", file, userId);

        // 异步执行
        executeAsync(task.getId(), file);

        return task;
    }

    /**
     * 截图处理
     */
    @Transactional
    public ImageTask processScreenshot(MultipartFile file, String action, Long userId) {
        ImageTask task = new ImageTask();
        task.setTaskType("screenshot-" + action);
        task.setStatus("pending");
        task.setUserId(userId);

        // 保存截图
        String inputPath = saveImage(file);
        task.setInputImagePath(inputPath);

        ImageTask saved = taskRepository.save(task);

        // 异步执行
        executeAsync(saved.getId(), file);

        return saved;
    }

    /**
     * 获取任务状态
     */
    @Transactional(readOnly = true)
    public ImageTask getTaskStatus(Long taskId) {
        return taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在：" + taskId));
    }

    /**
     * 获取任务历史
     */
    @Transactional(readOnly = true)
    public List<ImageTask> getHistory(Long userId, int limit) {
        if (userId != null) {
            return taskRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
        return taskRepository.findAll().stream()
            .sorted(Comparator.comparing(ImageTask::getCreatedAt).reversed())
            .limit(limit)
            .toList();
    }

    // ===== 私有方法 =====

    /**
     * 创建任务
     */
    private ImageTask createTask(String type, MultipartFile file, Long userId) {
        ImageTask task = new ImageTask();
        task.setTaskType(type);
        task.setStatus("pending");
        task.setUserId(userId);

        // 保存图片
        String inputPath = saveImage(file);
        task.setInputImagePath(inputPath);

        return taskRepository.save(task);
    }

    /**
     * 保存图片
     */
    private String saveImage(MultipartFile file) {
        try {
            String filename = "img_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            String path = UPLOAD_DIR + "/" + filename;

            Path filePath = Paths.get(path);
            if (!Files.exists(filePath.getParent())) {
                Files.createDirectories(filePath.getParent());
            }

            file.transferTo(filePath.toFile());
            return path;
        } catch (IOException e) {
            throw new RuntimeException("保存图片失败", e);
        }
    }

    /**
     * 异步执行任务
     */
    private void executeAsync(Long taskId, MultipartFile file) {
        CompletableFuture.runAsync(() -> {
            try {
                ImageTask task = taskRepository.findById(taskId).orElse(null);
                if (task == null) return;

                task.setStatus("processing");
                taskRepository.save(task);

                Map<String, Object> result;

                switch (task.getTaskType()) {
                    case "recognize" -> result = performRecognition(file);
                    case "ocr" -> result = performOCR(file);
                    case "ui-to-code" -> result = performUiToCode(file);
                    default -> result = Map.of("error", "未知任务类型");
                }

                task.setOutputResult(objectMapper.writeValueAsString(result));
                task.setStatus("completed");

            } catch (Exception e) {
                log.error("图像处理失败", e);
                taskRepository.findById(taskId).ifPresent(t -> {
                    t.setStatus("failed");
                    t.setErrorMessage(e.getMessage());
                    taskRepository.save(t);
                });
            }
        });
    }

    /**
     * 执行图像识别
     */
    private Map<String, Object> performRecognition(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();

        // TODO: 调用视觉模型 API (如 GPT-4V, Qwen-VL)
        // 这里返回示例结果

        result.put("description", "这是一张示例图片");
        result.put("objects", List.of("物体 1", "物体 2"));
        result.put("colors", List.of("蓝色", "白色"));
        result.put("scene", "室内场景");
        result.put("confidence", 0.95);

        return result;
    }

    /**
     * 执行 OCR
     */
    private Map<String, Object> performOCR(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();

        // TODO: 调用 OCR API (如阿里云 OCR、Tesseract)

        result.put("text", "识别的文字内容...");
        result.put("language", "zh-CN");
        result.put("confidence", 0.98);
        result.put("lines", List.of(
            Map.of("text", "第一行文字", "bbox", List.of(0, 0, 100, 20)),
            Map.of("text", "第二行文字", "bbox", List.of(0, 25, 100, 45))
        ));

        return result;
    }

    /**
     * UI 转代码
     */
    private Map<String, Object> performUiToCode(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();

        // TODO: 调用多模态模型分析 UI 并生成代码

        result.put("html", "<div>示例 HTML</div>");
        result.put("css", ".example { color: blue; }");
        result.put("components", List.of("Button", "Input", "Container"));
        result.put("framework", "React");

        return result;
    }
}
