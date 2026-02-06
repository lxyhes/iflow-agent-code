package com.iflow.agent.controller;

import com.iflow.agent.domain.command.entity.CommandShortcut;
import com.iflow.agent.domain.command.service.CommandShortcutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 命令快捷键 API
 */
@Slf4j
@RestController
@RequestMapping("/api/command-shortcuts")
@RequiredArgsConstructor
public class CommandShortcutController {

    private final CommandShortcutService commandShortcutService;

    /**
     * 获取所有快捷键
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllShortcuts(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId) {
        log.info("获取所有快捷键: userId={}", userId);

        List<CommandShortcut> shortcuts = commandShortcutService.getAllShortcuts(userId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "shortcuts", shortcuts,
                "total", shortcuts.size()
        ));
    }

    /**
     * 创建快捷键
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createShortcut(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @RequestBody CreateShortcutRequest request) {
        log.info("创建快捷键: {} for user: {}", request.getName(), userId);

        CommandShortcut shortcut = CommandShortcut.builder()
                .name(request.getName())
                .description(request.getDescription())
                .shortcutKey(request.getShortcutKey())
                .command(request.getCommand())
                .category(request.getCategory())
                .tags(request.getTags())
                .isGlobal(request.getIsGlobal())
                .isEnabled(true)
                .build();

        CommandShortcut created = commandShortcutService.createShortcut(shortcut, userId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "快捷键已创建",
                "shortcut", created
        ));
    }

    /**
     * 更新快捷键
     */
    @PutMapping("/{shortcutId}")
    public ResponseEntity<Map<String, Object>> updateShortcut(
            @PathVariable String shortcutId,
            @RequestBody UpdateShortcutRequest request) {
        log.info("更新快捷键: {}", shortcutId);

        CommandShortcut shortcut = CommandShortcut.builder()
                .name(request.getName())
                .description(request.getDescription())
                .shortcutKey(request.getShortcutKey())
                .command(request.getCommand())
                .category(request.getCategory())
                .tags(request.getTags())
                .isGlobal(request.getIsGlobal())
                .isEnabled(request.getIsEnabled())
                .build();

        CommandShortcut updated = commandShortcutService.updateShortcut(shortcutId, shortcut);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "快捷键已更新",
                "shortcut", updated
        ));
    }

    /**
     * 删除快捷键
     */
    @DeleteMapping("/{shortcutId}")
    public ResponseEntity<Map<String, Object>> deleteShortcut(@PathVariable String shortcutId) {
        log.info("删除快捷键: {}", shortcutId);

        boolean success = commandShortcutService.deleteShortcut(shortcutId);

        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", success ? "快捷键已删除" : "快捷键不存在"
        ));
    }

    /**
     * 执行快捷键
     */
    @PostMapping("/{shortcutId}/execute")
    public ResponseEntity<Map<String, Object>> executeShortcut(
            @PathVariable String shortcutId,
            @RequestBody(required = false) Map<String, Object> context) {
        log.info("执行快捷键: {}", shortcutId);

        Map<String, Object> result = commandShortcutService.executeShortcut(
                shortcutId,
                context != null ? context : Map.of()
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "result", result
        ));
    }

    /**
     * 获取分类列表
     */
    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        log.info("获取分类列表");

        List<String> categories = commandShortcutService.getCategories();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "categories", categories
        ));
    }

    /**
     * 获取标签列表
     */
    @GetMapping("/tags")
    public ResponseEntity<Map<String, Object>> getTags() {
        log.info("获取标签列表");

        List<String> tags = commandShortcutService.getTags();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "tags", tags
        ));
    }

    /**
     * 获取使用历史
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getUsageHistory(
            @RequestHeader(value = "X-User-Id", defaultValue = "default-user") String userId,
            @RequestParam(defaultValue = "20") int limit) {
        log.info("获取使用历史: userId={}, limit={}", userId, limit);

        List<Map<String, Object>> history = commandShortcutService.getUsageHistory(userId, limit);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "history", history,
                "total", history.size()
        ));
    }

    // ========== 请求类 ==========

    @lombok.Data
    public static class CreateShortcutRequest {
        private String name;
        private String description;
        private String shortcutKey;
        private String command;
        private String category;
        private List<String> tags;
        private Boolean isGlobal = false;
    }

    @lombok.Data
    public static class UpdateShortcutRequest {
        private String name;
        private String description;
        private String shortcutKey;
        private String command;
        private String category;
        private List<String> tags;
        private Boolean isGlobal;
        private Boolean isEnabled;
    }
}
