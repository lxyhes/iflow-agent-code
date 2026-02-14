package com.iflow.agent.service.ai;

import cn.iflow.sdk.core.IFlowClient;
import cn.iflow.sdk.process.IFlowProcessManager;
import cn.iflow.sdk.types.config.IFlowOptions;
import cn.iflow.sdk.types.enums.PermissionMode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.io.File;
import java.lang.reflect.Field;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

/**
 * iFlow 客户端管理器
 * 支持动态重新初始化客户端（用于更新 API Key 后重启连接）
 * 支持自动重启 iFlow CLI 进程以应用新的 API Key
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IFlowClientManager {

    @Value("${iflow.sdk.url:ws://localhost:8090/acp}")
    private String url;

    @Value("${iflow.sdk.auto-start:true}")
    private boolean autoStart;

    @Value("${iflow.sdk.timeout-seconds:30}")
    private int timeoutSeconds;

    @Value("${iflow.sdk.permission-mode:AUTO}")
    private String permissionMode;

    private final AtomicReference<IFlowClient> clientRef = new AtomicReference<>();
    private final AtomicReference<IFlowProcessManager> processManagerRef = new AtomicReference<>();
    private final ApiKeyManager apiKeyManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        createClient();
    }

    /**
     * 更新环境变量中的 API Key
     * 注意：通过反射修改环境变量不可靠，仅作为备用方案
     */
    private void updateEnvironmentApiKey(String apiKey) {
        if (apiKey != null && !apiKey.isEmpty()) {
            try {
                // 使用反射修改环境变量
                Map<String, String> env = System.getenv();
                Class<?> cl = env.getClass();
                Field field = cl.getDeclaredField("m");
                field.setAccessible(true);
                Map<String, String> writableEnv = (Map<String, String>) field.get(env);
                writableEnv.put("IFLOW_API_KEY", apiKey);
                log.info("Updated IFLOW_API_KEY environment variable");
            } catch (Exception e) {
                log.warn("Failed to update environment variable: {}", e.getMessage());
            }
        }
    }

    /**
     * 更新 iflow CLI 配置文件中的 API Key
     * 这是让 API Key 真正生效的关键步骤
     */
    private void updateIflowConfigFile(String apiKey) {
        if (apiKey == null || apiKey.isEmpty()) {
            return;
        }
        
        try {
            String homeDir = System.getProperty("user.home");
            File settingsFile = new File(homeDir, ".iflow/settings.json");
            
            if (!settingsFile.exists()) {
                log.warn("iflow settings file not found: {}", settingsFile.getAbsolutePath());
                return;
            }
            
            // 读取现有配置
            JsonNode root = objectMapper.readTree(settingsFile);
            if (!(root instanceof ObjectNode)) {
                log.warn("Invalid iflow settings file format");
                return;
            }
            
            ObjectNode config = (ObjectNode) root;
            
            // 更新 API Key
            config.put("apiKey", apiKey);
            // 同时更新 searchApiKey（如果存在）
            if (config.has("searchApiKey")) {
                config.put("searchApiKey", apiKey);
            }
            
            // 写回文件
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(settingsFile, config);
            
            log.info("Updated iflow settings file with new API Key: {}...", 
                apiKey.substring(0, Math.min(8, apiKey.length())));
        } catch (Exception e) {
            log.error("Failed to update iflow config file: {}", e.getMessage(), e);
        }
    }

    /**
     * 创建新的 iFlow 客户端
     */
    private void createClient() {
        try {
            // 关闭旧客户端
            IFlowClient oldClient = clientRef.get();
            if (oldClient != null) {
                try {
                    oldClient.close();
                    log.info("Old iFlow client closed");
                } catch (Exception e) {
                    log.warn("Error closing old iFlow client: {}", e.getMessage());
                }
            }

            // 直接从 ApiKeyManager 获取 API Key（优先使用动态设置的）
            String apiKey = apiKeyManager.getApiKey();

            // 更新 iflow 配置文件（确保 CLI 使用正确的 API Key）
            updateIflowConfigFile(apiKey);

            // 同时更新环境变量作为备用
            updateEnvironmentApiKey(apiKey);

            // 构建选项
            IFlowOptions options = IFlowOptions.builder()
                    .url(url)
                    .autoStartProcess(autoStart)
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .permissionMode(PermissionMode.valueOf(permissionMode.toUpperCase()))
                    .build();

            if (apiKey != null && !apiKey.isEmpty()) {
                log.info("Creating iFlow client with API Key from ApiKeyManager: {}...", apiKey.substring(0, Math.min(8, apiKey.length())));
            } else {
                log.info("Creating iFlow client without explicit API Key");
            }

            IFlowClient newClient = IFlowClient.create(options);
            clientRef.set(newClient);

            // 创建进程管理器
            IFlowProcessManager processManager = new IFlowProcessManager(options);
            processManagerRef.set(processManager);

            log.info("iFlow client created successfully");
        } catch (Exception e) {
            log.error("Failed to create iFlow client: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create iFlow client", e);
        }
    }

    /**
     * 重新初始化客户端（在更新 API Key 后调用）
     */
    public void reinitialize(String apiKey) {
        log.info("Reinitializing iFlow client due to API Key change");
        
        // 1. 停止旧的 iFlow CLI 进程
        IFlowProcessManager oldProcessManager = processManagerRef.get();
        if (oldProcessManager != null) {
            try {
                log.info("Stopping old iFlow CLI process...");
                CompletableFuture<Void> stopFuture = oldProcessManager.stopProcess();
                stopFuture.get(); // 等待进程停止
                log.info("Old iFlow CLI process stopped successfully");
            } catch (Exception e) {
                log.warn("Error stopping old iFlow CLI process: {}", e.getMessage());
            }
        }

        // 2. 更新 iflow 配置文件（这是关键步骤，让新的 API Key 真正生效）
        updateIflowConfigFile(apiKey);

        // 3. 更新环境变量（作为备用）
        updateEnvironmentApiKey(apiKey);

        // 4. 重新创建客户端（会自动启动新的 iFlow CLI 进程）
        createClient();

        // 5. 确保新进程正在运行
        IFlowProcessManager newProcessManager = processManagerRef.get();
        if (newProcessManager != null) {
            try {
                log.info("Ensuring new iFlow CLI process is running...");
                CompletableFuture<Integer> ensureFuture = newProcessManager.ensureProcessRunning();
                Integer port = ensureFuture.get();
                log.info("New iFlow CLI process started on port: {}", port);
            } catch (Exception e) {
                log.error("Error ensuring iFlow CLI process is running: {}", e.getMessage(), e);
            }
        }
    }

    /**
     * 监听 API Key 变更事件
     */
    @EventListener
    public void onApiKeyChanged(ApiKeyManager.ApiKeyChangedEvent event) {
        log.info("Received API Key changed event, reinitializing iFlow client...");
        reinitialize(event.getApiKey());
    }

    /**
     * 获取当前客户端
     */
    public IFlowClient getClient() {
        IFlowClient client = clientRef.get();
        if (client == null) {
            throw new IllegalStateException("iFlow client not initialized");
        }
        return client;
    }

    /**
     * 检查连接状态
     */
    public boolean isConnected() {
        try {
            IFlowClient client = getClient();
            client.connect().block();
            return true;
        } catch (Exception e) {
            log.warn("iFlow not connected: {}", e.getMessage());
            return false;
        }
    }

    @PreDestroy
    public void destroy() {
        IFlowClient client = clientRef.get();
        if (client != null) {
            try {
                client.close();
                log.info("iFlow client destroyed");
            } catch (Exception e) {
                log.error("Error destroying iFlow client", e);
            }
        }

        IFlowProcessManager processManager = processManagerRef.get();
        if (processManager != null) {
            try {
                processManager.close();
                log.info("iFlow CLI process manager destroyed");
            } catch (Exception e) {
                log.error("Error destroying iFlow CLI process manager", e);
            }
        }
    }
}
