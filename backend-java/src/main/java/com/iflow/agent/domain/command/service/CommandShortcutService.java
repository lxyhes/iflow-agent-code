package com.iflow.agent.domain.command.service;

import com.iflow.agent.domain.command.entity.CommandShortcut;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 命令快捷键服务接口
 */
public interface CommandShortcutService {

    /**
     * 获取所有快捷键
     */
    List<CommandShortcut> getAllShortcuts(String userId);

    /**
     * 获取快捷键详情
     */
    Optional<CommandShortcut> getShortcut(String shortcutId);

    /**
     * 创建快捷键
     */
    CommandShortcut createShortcut(CommandShortcut shortcut, String userId);

    /**
     * 更新快捷键
     */
    CommandShortcut updateShortcut(String shortcutId, CommandShortcut shortcut);

    /**
     * 删除快捷键
     */
    boolean deleteShortcut(String shortcutId);

    /**
     * 执行快捷键命令
     */
    Map<String, Object> executeShortcut(String shortcutId, Map<String, Object> context);

    /**
     * 获取分类列表
     */
    List<String> getCategories();

    /**
     * 获取标签列表
     */
    List<String> getTags();

    /**
     * 获取使用历史
     */
    List<Map<String, Object>> getUsageHistory(String userId, int limit);

    /**
     * 根据分类获取快捷键
     */
    List<CommandShortcut> getShortcutsByCategory(String category);

    /**
     * 根据标签获取快捷键
     */
    List<CommandShortcut> getShortcutsByTag(String tag);
}
