package com.iflow.agent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 聊天 API
 */
@Slf4j
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    /**
     * 生成聊天建议
     */
    @PostMapping("/suggestions/{projectName}")
    public ResponseEntity<Map<String, Object>> generateSuggestions(
            @PathVariable String projectName,
            @RequestBody(required = false) Map<String, Object> options) {
        try {
            log.info("生成聊天建议: {}, options: {}, options size: {}",
                    projectName, options, options != null ? options.size() : 0);

            if (options != null) {
                log.debug("Options keys: {}", options.keySet());
                Object context = options.get("context");
                if (context != null) {
                    String contextStr = context.toString().trim();
                    // 更严格的检查：如果 context 以 "undefined:" 开头，或包含错误消息，则拒绝
                    if (contextStr.startsWith("undefined:") ||
                        contextStr.contains("Error:") ||
                        contextStr.contains("HTTP") ||
                        contextStr.equals("undefined")) {
                        log.warn("Context is malformed (contains undefined or error messages), ignoring it. Context preview: {}",
                                contextStr.substring(0, Math.min(50, contextStr.length())));
                        options.remove("context");
                    } else if (!contextStr.isEmpty()) {
                        log.debug("Context value (first 100 chars): {}",
                                contextStr.substring(0, Math.min(100, contextStr.length())));
                    }
                } else {
                    log.debug("Context value: null");
                }
            }

            // 返回默认建议
            List<Map<String, Object>> suggestions = List.of(
                    Map.of(
                            "title", "解释代码",
                            "prompt", "请解释当前代码的功能和实现逻辑"
                    ),
                    Map.of(
                            "title", "优化建议",
                            "prompt", "请分析代码并提供优化建议"
                    ),
                    Map.of(
                            "title", "生成测试",
                            "prompt", "请为当前代码生成单元测试"
                    ),
                    Map.of(
                            "title", "查找 Bug",
                            "prompt", "请检查代码中可能存在的 Bug"
                    )
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "suggestions", suggestions
            ));
        } catch (Exception e) {
            log.error("生成聊天建议失败", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}
