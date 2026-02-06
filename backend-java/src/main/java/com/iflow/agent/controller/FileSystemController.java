package com.iflow.agent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 文件系统浏览 API
 */
@Slf4j
@RestController
@RequestMapping("/api")
public class FileSystemController {

    /**
     * 浏览文件系统
     */
    @GetMapping("/browse-filesystem")
    public ResponseEntity<Map<String, Object>> browseFileSystem(
            @RequestParam(defaultValue = ".") String path) {
        log.info("浏览文件系统: {}", path);

        try {
            Path targetPath = Paths.get(path).toAbsolutePath().normalize();
            File directory = targetPath.toFile();

            if (!directory.exists() || !directory.isDirectory()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "路径不存在或不是目录"
                ));
            }

            List<Map<String, Object>> items = new ArrayList<>();
            File[] files = directory.listFiles();

            if (files != null) {
                for (File file : files) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("name", file.getName());
                    item.put("path", file.getAbsolutePath());
                    item.put("isDirectory", file.isDirectory());
                    item.put("size", file.length());
                    item.put("lastModified", file.lastModified());
                    items.add(item);
                }
            }

            // 添加父目录
            File parentFile = directory.getParentFile();
            if (parentFile != null) {
                Map<String, Object> parentItem = new HashMap<>();
                parentItem.put("name", "..");
                parentItem.put("path", parentFile.getAbsolutePath());
                parentItem.put("isDirectory", true);
                parentItem.put("size", 0L);
                parentItem.put("lastModified", parentFile.lastModified());
                items.add(0, parentItem);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "path", targetPath.toString(),
                    "items", items
            ));

        } catch (Exception e) {
            log.error("浏览文件系统失败", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "浏览失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 获取文件内容
     */
    @GetMapping("/read-file")
    public ResponseEntity<Map<String, Object>> readFile(@RequestParam String path) {
        log.info("读取文件: {}", path);

        try {
            Path filePath = Paths.get(path).toAbsolutePath().normalize();
            File file = filePath.toFile();

            if (!file.exists() || !file.isFile()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "文件不存在"
                ));
            }

            // 限制文件大小
            if (file.length() > 10 * 1024 * 1024) { // 10MB
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "文件太大 (>10MB)"
                ));
            }

            String content = Files.readString(filePath);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "path", filePath.toString(),
                    "content", content,
                    "size", file.length()
            ));

        } catch (Exception e) {
            log.error("读取文件失败", e);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "读取失败: " + e.getMessage()
            ));
        }
    }
}
