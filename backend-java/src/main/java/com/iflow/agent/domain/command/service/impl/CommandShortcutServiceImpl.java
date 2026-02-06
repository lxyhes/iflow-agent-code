package com.iflow.agent.domain.command.service.impl;

import com.iflow.agent.domain.command.entity.CommandShortcut;
import com.iflow.agent.domain.command.repository.CommandShortcutRepository;
import com.iflow.agent.domain.command.service.CommandShortcutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 命令快捷键服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommandShortcutServiceImpl implements CommandShortcutService {

    private final CommandShortcutRepository shortcutRepository;

    // 使用历史缓存（简化实现）
    private final Map<String, List<Map<String, Object>>> usageHistoryCache = new HashMap<>();

    @Override
    public List<CommandShortcut> getAllShortcuts(String userId) {
        log.info("获取所有快捷键: userId={}", userId);
        
        List<CommandShortcut> userShortcuts = shortcutRepository.findByCreatedByOrderByUsageCountDesc(userId);
        List<CommandShortcut> globalShortcuts = shortcutRepository.findByIsGlobalTrueOrderByUsageCountDesc();
        
        // 合并用户快捷键和全局快捷键
        Set<String> userShortcutIds = userShortcuts.stream()
                .map(CommandShortcut::getId)
                .collect(Collectors.toSet());
        
        for (CommandShortcut global : globalShortcuts) {
            if (!userShortcutIds.contains(global.getId())) {
                userShortcuts.add(global);
            }
        }
        
        return userShortcuts;
    }

    @Override
    public Optional<CommandShortcut> getShortcut(String shortcutId) {
        log.info("获取快捷键详情: {}", shortcutId);
        return shortcutRepository.findById(shortcutId);
    }

    @Override
    @Transactional
    public CommandShortcut createShortcut(CommandShortcut shortcut, String userId) {
        log.info("创建快捷键: {} for user: {}", shortcut.getName(), userId);
        
        // 检查快捷键是否已存在
        Optional<CommandShortcut> existing = shortcutRepository
                .findByShortcutKeyAndCreatedBy(shortcut.getShortcutKey(), userId);
        
        if (existing.isPresent()) {
            throw new IllegalArgumentException("快捷键已存在: " + shortcut.getShortcutKey());
        }
        
        shortcut.setCreatedBy(userId);
        shortcut.setUsageCount(0);
        shortcut.setCreatedAt(LocalDateTime.now());
        
        return shortcutRepository.save(shortcut);
    }

    @Override
    @Transactional
    public CommandShortcut updateShortcut(String shortcutId, CommandShortcut shortcut) {
        log.info("更新快捷键: {}", shortcutId);
        
        CommandShortcut existing = shortcutRepository.findById(shortcutId)
                .orElseThrow(() -> new IllegalArgumentException("快捷键不存在: " + shortcutId));
        
        if (shortcut.getName() != null) {
            existing.setName(shortcut.getName());
        }
        if (shortcut.getDescription() != null) {
            existing.setDescription(shortcut.getDescription());
        }
        if (shortcut.getShortcutKey() != null) {
            existing.setShortcutKey(shortcut.getShortcutKey());
        }
        if (shortcut.getCommand() != null) {
            existing.setCommand(shortcut.getCommand());
        }
        if (shortcut.getCategory() != null) {
            existing.setCategory(shortcut.getCategory());
        }
        if (shortcut.getTags() != null) {
            existing.setTags(shortcut.getTags());
        }
        if (shortcut.getIsGlobal() != null) {
            existing.setIsGlobal(shortcut.getIsGlobal());
        }
        if (shortcut.getIsEnabled() != null) {
            existing.setIsEnabled(shortcut.getIsEnabled());
        }
        
        existing.setUpdatedAt(LocalDateTime.now());
        
        return shortcutRepository.save(existing);
    }

    @Override
    @Transactional
    public boolean deleteShortcut(String shortcutId) {
        log.info("删除快捷键: {}", shortcutId);
        
        if (!shortcutRepository.existsById(shortcutId)) {
            return false;
        }
        
        shortcutRepository.deleteById(shortcutId);
        return true;
    }

    @Override
    @Transactional
    public Map<String, Object> executeShortcut(String shortcutId, Map<String, Object> context) {
        log.info("执行快捷键: {}", shortcutId);
        
        CommandShortcut shortcut = shortcutRepository.findById(shortcutId)
                .orElseThrow(() -> new IllegalArgumentException("快捷键不存在: " + shortcutId));
        
        if (!Boolean.TRUE.equals(shortcut.getIsEnabled())) {
            throw new IllegalStateException("快捷键已禁用: " + shortcutId);
        }
        
        // 增加使用次数
        shortcut.incrementUsage();
        shortcutRepository.save(shortcut);
        
        // 记录使用历史
        recordUsageHistory(shortcut);
        
        // 执行命令（简化实现）
        String command = shortcut.getCommand();
        Map<String, Object> result = new HashMap<>();
        
        // 解析命令并执行
        if (command != null && !command.isEmpty()) {
            result = executeCommand(command, context);
        }
        
        result.put("shortcut_name", shortcut.getName());
        result.put("shortcut_key", shortcut.getShortcutKey());
        result.put("executed_at", LocalDateTime.now().toString());
        
        return result;
    }

    @Override
    public List<String> getCategories() {
        log.info("获取分类列表");
        
        // 预定义的分类
        return List.of(
                "文件操作",
                "编辑",
                "导航",
                "搜索",
                "AI功能",
                "Git",
                "数据库",
                "其他"
        );
    }

    @Override
    public List<String> getTags() {
        log.info("获取标签列表");
        
        // 从所有快捷键中提取标签
        List<CommandShortcut> allShortcuts = shortcutRepository.findAll();
        Set<String> tags = new HashSet<>();
        
        for (CommandShortcut shortcut : allShortcuts) {
            if (shortcut.getTags() != null) {
                tags.addAll(shortcut.getTags());
            }
        }
        
        return new ArrayList<>(tags);
    }

    @Override
    public List<Map<String, Object>> getUsageHistory(String userId, int limit) {
        log.info("获取使用历史: userId={}, limit={}", userId, limit);
        
        List<Map<String, Object>> history = usageHistoryCache.getOrDefault(userId, new ArrayList<>());
        
        // 限制数量
        if (history.size() > limit) {
            return history.subList(0, limit);
        }
        
        return history;
    }

    @Override
    public List<CommandShortcut> getShortcutsByCategory(String category) {
        log.info("获取分类快捷键: {}", category);
        return shortcutRepository.findByCategoryOrderByUsageCountDesc(category);
    }

    @Override
    public List<CommandShortcut> getShortcutsByTag(String tag) {
        log.info("获取标签快捷键: {}", tag);
        return shortcutRepository.findByTagsContaining(tag);
    }

    // ========== 私有方法 ==========

    private void recordUsageHistory(CommandShortcut shortcut) {
        String userId = shortcut.getCreatedBy();
        
        Map<String, Object> record = new HashMap<>();
        record.put("shortcut_id", shortcut.getId());
        record.put("shortcut_name", shortcut.getName());
        record.put("shortcut_key", shortcut.getShortcutKey());
        record.put("executed_at", LocalDateTime.now().toString());
        
        usageHistoryCache.computeIfAbsent(userId, k -> new ArrayList<>()).add(0, record);
        
        // 限制历史记录数量
        List<Map<String, Object>> history = usageHistoryCache.get(userId);
        if (history.size() > 100) {
            usageHistoryCache.put(userId, history.subList(0, 100));
        }
    }

    private Map<String, Object> executeCommand(String command, Map<String, Object> context) {
        Map<String, Object> result = new HashMap<>();
        
        // 简单的命令解析和执行
        String[] parts = command.split(" ");
        String action = parts[0];
        
        switch (action.toLowerCase()) {
            case "open" -> {
                result.put("action", "open");
                result.put("target", parts.length > 1 ? parts[1] : "");
                result.put("message", "打开文件/目录");
            }
            case "search" -> {
                result.put("action", "search");
                result.put("query", parts.length > 1 ? parts[1] : "");
                result.put("message", "执行搜索");
            }
            case "run" -> {
                result.put("action", "run");
                result.put("command", String.join(" ", Arrays.copyOfRange(parts, 1, parts.length)));
                result.put("message", "执行命令");
            }
            case "ai" -> {
                result.put("action", "ai");
                result.put("prompt", String.join(" ", Arrays.copyOfRange(parts, 1, parts.length)));
                result.put("message", "调用AI功能");
            }
            default -> {
                result.put("action", "unknown");
                result.put("command", command);
                result.put("message", "未知命令");
            }
        }
        
        return result;
    }
}
