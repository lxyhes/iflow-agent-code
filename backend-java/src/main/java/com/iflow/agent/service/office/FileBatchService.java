package com.iflow.agent.service.office;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflow.agent.entity.FileBatchTask;
import com.iflow.agent.repository.FileBatchTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * 文件批量处理服务
 * 支持批量重命名、分类、合并等操作
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileBatchService {

    private final FileBatchTaskRepository taskRepository;
    private final ObjectMapper objectMapper;
    private final ExecutorService executorService = Executors.newCachedThreadPool();

    /**
     * 创建批量重命名任务
     */
    @Transactional
    public FileBatchTask createRenameTask(List<String> filePaths, String pattern, Long userId) {
        FileBatchTask task = new FileBatchTask();
        task.setTaskType("rename");
        task.setSourcePaths(toJson(filePaths));
        task.setConfig(toJson(Map.of("pattern", pattern)));
        task.setStatus("pending");
        task.setUserId(userId);
        
        FileBatchTask saved = taskRepository.save(task);
        
        // 异步执行
        executorService.submit(() -> executeRenameTask(saved.getId(), filePaths, pattern));
        
        return saved;
    }

    /**
     * 创建批量分类任务
     */
    @Transactional
    public FileBatchTask createClassifyTask(List<String> filePaths, String targetDir, Long userId) {
        FileBatchTask task = new FileBatchTask();
        task.setTaskType("classify");
        task.setSourcePaths(toJson(filePaths));
        task.setTargetPath(targetDir);
        task.setStatus("pending");
        task.setUserId(userId);
        
        FileBatchTask saved = taskRepository.save(task);
        
        // 异步执行
        executorService.submit(() -> executeClassifyTask(saved.getId(), filePaths, targetDir));
        
        return saved;
    }

    /**
     * 创建文件合并任务
     */
    @Transactional
    public FileBatchTask createMergeTask(List<String> filePaths, String outputPath, Long userId) {
        FileBatchTask task = new FileBatchTask();
        task.setTaskType("merge");
        task.setSourcePaths(toJson(filePaths));
        task.setTargetPath(outputPath);
        task.setStatus("pending");
        task.setUserId(userId);
        
        FileBatchTask saved = taskRepository.save(task);
        
        // 异步执行
        executorService.submit(() -> executeMergeTask(saved.getId(), filePaths, outputPath));
        
        return saved;
    }

    /**
     * 执行重命名任务
     */
    private void executeRenameTask(Long taskId, List<String> filePaths, String pattern) {
        try {
            taskRepository.findById(taskId).ifPresent(task -> task.setStatus("running"));
            
            List<Map<String, String>> results = new ArrayList<>();
            int successCount = 0;
            int failCount = 0;
            int[] finalSuccessCount = {0};
            int[] finalFailCount = {0};

            for (String filePath : filePaths) {
                try {
                    Path path = Paths.get(filePath);
                    if (!Files.exists(path)) {
                        results.add(Map.of(
                            "file", filePath,
                            "status", "failed",
                            "error", "文件不存在"
                        ));
                        finalFailCount[0]++;
                        continue;
                    }

                    // 生成新文件名
                    String fileName = path.getFileName().toString();
                    String newFileName = generateNewFileName(fileName, pattern);
                    Path newPath = path.resolveSibling(newFileName);

                    Files.move(path, newPath, StandardCopyOption.REPLACE_EXISTING);

                    results.add(Map.of(
                        "file", filePath,
                        "newFile", newPath.toString(),
                        "status", "success"
                    ));
                    finalSuccessCount[0]++;

                } catch (Exception e) {
                    log.error("重命名文件失败：{}", filePath, e);
                    results.add(Map.of(
                        "file", filePath,
                        "status", "failed",
                        "error", e.getMessage()
                    ));
                    finalFailCount[0]++;
                }
            }

            // 更新任务状态
            taskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("completed");
                task.setCompletedAt(LocalDateTime.now());
                task.setResult(toJson(Map.of(
                    "total", filePaths.size(),
                    "success", finalSuccessCount[0],
                    "failed", finalFailCount[0],
                    "results", results
                )));
            });
            
        } catch (Exception e) {
            log.error("重命名任务执行失败", e);
            taskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("failed");
                task.setErrorMessage(e.getMessage());
            });
        }
    }

    /**
     * 执行分类任务
     */
    private void executeClassifyTask(Long taskId, List<String> filePaths, String targetDir) {
        try {
            taskRepository.findById(taskId).ifPresent(task -> task.setStatus("running"));

            List<Map<String, String>> results = new ArrayList<>();
            Map<String, Integer> categoryCount = new HashMap<>();
            int successCount = 0;
            int failCount = 0;
            int[] finalSuccessCount = {0};
            int[] finalFailCount = {0};
            final Map<String, Integer> finalCategoryCount = new HashMap<>();

            Path targetPath = Paths.get(targetDir);
            if (!Files.exists(targetPath)) {
                Files.createDirectories(targetPath);
            }

            for (String filePath : filePaths) {
                try {
                    Path path = Paths.get(filePath);
                    if (!Files.exists(path)) {
                        results.add(Map.of(
                            "file", filePath,
                            "status", "failed",
                            "error", "文件不存在"
                        ));
                        finalFailCount[0]++;
                        continue;
                    }

                    // 根据扩展名分类
                    String ext = getFileExtension(path.getFileName().toString());
                    String category = getCategoryByExtension(ext);

                    Path categoryDir = targetPath.resolve(category);
                    if (!Files.exists(categoryDir)) {
                        Files.createDirectories(categoryDir);
                    }

                    Path newPath = categoryDir.resolve(path.getFileName());
                    Files.copy(path, newPath, StandardCopyOption.REPLACE_EXISTING);

                    results.add(Map.of(
                        "file", filePath,
                        "newFile", newPath.toString(),
                        "category", category,
                        "status", "success"
                    ));

                    finalCategoryCount.merge(category, 1, Integer::sum);
                    finalSuccessCount[0]++;
                    
                } catch (Exception e) {
                    log.error("分类文件失败：{}", filePath, e);
                    results.add(Map.of(
                        "file", filePath,
                        "status", "failed",
                        "error", e.getMessage()
                    ));
                    finalFailCount[0]++;
                }
            }

            taskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("completed");
                task.setCompletedAt(LocalDateTime.now());
                task.setResult(toJson(Map.of(
                    "total", filePaths.size(),
                    "success", finalSuccessCount[0],
                    "failed", finalFailCount[0],
                    "categories", finalCategoryCount,
                    "results", results
                )));
            });
            
        } catch (Exception e) {
            log.error("分类任务执行失败", e);
            taskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("failed");
                task.setErrorMessage(e.getMessage());
            });
        }
    }

    /**
     * 执行合并任务
     */
    private void executeMergeTask(Long taskId, List<String> filePaths, String outputPath) {
        try {
            taskRepository.findById(taskId).ifPresent(task -> task.setStatus("running"));

            Path output = Paths.get(outputPath);
            Path parent = output.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }

            int[] finalSuccessCount = {0};
            StringBuilder content = new StringBuilder();

            for (String filePath : filePaths) {
                try {
                    Path path = Paths.get(filePath);
                    if (!Files.exists(path)) {
                        continue;
                    }

                    // 添加文件分隔符
                    content.append("--- File: ").append(path.getFileName()).append(" ---\n\n");
                    content.append(Files.readString(path));
                    content.append("\n\n");
                    finalSuccessCount[0]++;

                } catch (Exception e) {
                    log.error("读取文件失败：{}", filePath, e);
                }
            }

            Files.writeString(output, content.toString());

            taskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("completed");
                task.setCompletedAt(LocalDateTime.now());
                try {
                    long outputSize = Files.exists(output) ? Files.size(output) : 0;
                    task.setResult(toJson(Map.of(
                        "output", outputPath,
                        "mergedFiles", finalSuccessCount[0],
                        "outputSize", outputSize
                    )));
                } catch (JsonProcessingException e) {
                    log.error("结果序列化失败", e);
                } catch (IOException e) {
                    log.error("获取文件大小失败", e);
                }
            });
            
        } catch (Exception e) {
            log.error("合并任务执行失败", e);
            taskRepository.findById(taskId).ifPresent(task -> {
                task.setStatus("failed");
                task.setErrorMessage(e.getMessage());
            });
        }
    }

    /**
     * 获取任务状态
     */
    @Transactional(readOnly = true)
    public FileBatchTask getTaskStatus(Long taskId) {
        return taskRepository.findById(taskId)
            .orElseThrow(() -> new IllegalArgumentException("任务不存在：" + taskId));
    }

    /**
     * 获取用户任务历史
     */
    @Transactional(readOnly = true)
    public List<FileBatchTask> getTaskHistory(Long userId, int limit) {
        return taskRepository.findRecentTasksByUser(userId, limit);
    }

    // ===== 辅助方法 =====

    /**
     * 生成新文件名
     */
    private String generateNewFileName(String fileName, String pattern) {
        String name = getNameWithoutExtension(fileName);
        String ext = getFileExtension(fileName);
        
        // 支持的模式：{name}_{date}, {name}_{timestamp}, {index}_{name}, etc.
        String newFileName = pattern
            .replace("{name}", name)
            .replace("{date}", java.time.LocalDate.now().toString())
            .replace("{timestamp}", String.valueOf(System.currentTimeMillis()))
            .replace("{upper}", name.toUpperCase())
            .replace("{lower}", name.toLowerCase());
        
        return newFileName + ext;
    }

    /**
     * 根据扩展名获取分类目录
     */
    private String getCategoryByExtension(String ext) {
        return switch (ext.toLowerCase()) {
            case "jpg", "jpeg", "png", "gif", "bmp", "svg", "webp" -> "images";
            case "pdf", "doc", "docx", "txt", "md", "rtf" -> "documents";
            case "xls", "xlsx", "csv" -> "spreadsheets";
            case "ppt", "pptx" -> "presentations";
            case "mp3", "wav", "ogg", "flac" -> "audio";
            case "mp4", "avi", "mkv", "mov", "wmv" -> "videos";
            case "java", "py", "js", "ts", "go", "cpp", "c", "h", "cs", "php", "rb" -> "code";
            case "zip", "rar", "7z", "tar", "gz" -> "archives";
            default -> "others";
        };
    }

    /**
     * 获取文件扩展名
     */
    private String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot) : "";
    }

    /**
     * 获取不带扩展名的文件名
     */
    private String getNameWithoutExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
    }

    /**
     * 对象转 JSON
     */
    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.error("JSON 序列化失败", e);
            return "{}";
        }
    }
}
