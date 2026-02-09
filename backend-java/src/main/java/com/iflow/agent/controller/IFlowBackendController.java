package com.iflow.agent.controller;

import com.iflow.agent.config.IFlowBackendConfig;
import com.iflow.agent.service.IFlowProcessManager;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 工作台后端配置控制器
 * 用于动态切换 SDK 和 Subprocess 模式
 */
@Slf4j
@RestController
@RequestMapping("/api/iflow/backend")
@RequiredArgsConstructor
public class IFlowBackendController {

    private final IFlowBackendConfig backendConfig;
    private final IFlowProcessManager processManager;

    /**
     * 获取当前后端模式
     */
    @GetMapping("/mode")
    public ResponseEntity<Map<String, Object>> getBackendMode() {
        return ResponseEntity.ok(Map.of(
            "mode", backendConfig.getBackendMode(),
            "description", backendConfig.isSdkMode() ? 
                "使用 SDK 模式 - 类型安全，但不支持模型切换" : 
                "使用 Subprocess 模式 - 支持模型切换"
        ));
    }

    /**
     * 设置后端模式
     */
    @PostMapping("/mode")
    public ResponseEntity<Map<String, Object>> setBackendMode(@RequestBody BackendModeRequest request) {
        try {
            backendConfig.setBackendMode(request.getMode());
            log.info("Backend mode changed to: {}", request.getMode());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "mode", backendConfig.getBackendMode(),
                "message", "后端模式已更新为: " + request.getMode() + ". 下一请求将使用新模式。"
            ));
        } catch (IllegalArgumentException e) {
            log.error("Invalid backend mode: {}", request.getMode(), e);
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    /**
     * 切换模型（SDK 模式下）
     * 需要重启 AI 工作台 CLI 进程
     */
    @PostMapping("/model")
    public ResponseEntity<Map<String, Object>> switchModel(@RequestBody ModelSwitchRequest request) {
        try {
            if (!backendConfig.isSdkMode()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "模型切换功能仅在 SDK 模式下可用。Subprocess 模式支持动态模型切换，无需重启。"
                ));
            }

            String model = request.getModel();
            if (model == null || model.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "模型名称不能为空"
                ));
            }

            log.info("Switching AI 工作台 model to: {}", model);

            // 重启 AI 工作台 CLI 进程
            processManager.restartIFlowProcess(model);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "model", model,
                "message", "AI 工作台 CLI 进程已重启，模型已切换为: " + model + "。"
            ));
        } catch (Exception e) {
            log.error("Failed to switch model", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", "切换模型失败: " + e.getMessage()
            ));
        }
    }

    /**
     * 检查 AI 工作台进程状态
     */
    @GetMapping("/process/status")
    public ResponseEntity<Map<String, Object>> getProcessStatus() {
        try {
            boolean running = processManager.isIFlowRunning();
            return ResponseEntity.ok(Map.of(
                "running", running,
                "mode", backendConfig.getBackendMode(),
                "message", running ? "AI 工作台进程运行中" : "AI 工作台进程未运行"
            ));
        } catch (Exception e) {
            log.error("Failed to check process status", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    @Data
    public static class BackendModeRequest {
        private String mode;
    }

    @Data
    public static class ModelSwitchRequest {
        private String model;
    }
}