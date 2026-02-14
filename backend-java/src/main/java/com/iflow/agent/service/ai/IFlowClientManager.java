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
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
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

            // 先停止现有的 iFlow 进程（防止 SDK 连接到旧进程）
            stopExistingIflowProcess();

            // 等待进程完全停止
            Thread.sleep(1000);

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
     * 停止现有的 iFlow 进程（防止 SDK 连接到旧 Token 的进程）
     * 只杀掉 iflow.js 相关的 Node 进程，不杀掉其他进程
     */
    private void stopExistingIflowProcess() {
        log.info("Stopping existing iFlow process before creating new client...");
        try {
            // 只杀掉运行 iflow.js 的 Node 进程
            // 通过 ps 命令找到包含 iflow.js 的进程
            ProcessBuilder findPb = new ProcessBuilder("bash", "-c",
                "ps aux | grep 'iflow.js' | grep -v grep | awk '{print $2}'");
            findPb.redirectErrorStream(true);
            Process findProcess = findPb.start();
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(findProcess.getInputStream()));
            StringBuilder pids = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (!line.isEmpty()) {
                    pids.append(line).append(" ");
                }
            }
            findProcess.waitFor();
            
            String pidList = pids.toString().trim();
            if (!pidList.isEmpty()) {
                log.info("Found iflow processes to kill: {}", pidList);
                // 只杀掉找到的 iflow.js 进程
                ProcessBuilder killPb = new ProcessBuilder("bash", "-c",
                    "kill -9 " + pidList);
                killPb.redirectErrorStream(true);
                Process killProcess = killPb.start();
                killProcess.waitFor();
                log.info("Killed iflow processes successfully");
            } else {
                log.info("No iflow process found");
            }
            
            // 等待进程停止
            Thread.sleep(1000);
            
        } catch (Exception e) {
            log.warn("Error stopping existing iFlow process: {}", e.getMessage());
        }
    }

    /**
     * 重新初始化客户端（在更新 API Key 后调用）
     */
    public void reinitialize(String apiKey) {
        log.info("Reinitializing iFlow client due to API Key change");
        
        // 1. 更新 iflow 配置文件（这是关键步骤，让新的 API Key 真正生效）
        updateIflowConfigFile(apiKey);

        // 2. 更新环境变量（作为备用）
        updateEnvironmentApiKey(apiKey);

        // 3. 重新创建客户端（会自动停止旧进程并启动新的 iFlow CLI 进程）
        createClient();
    }

    /**
     * 在 SDK 查询前调用，确保停止现有进程
     * 防止 SDK 连接到使用旧 Token 的 iFlow 进程
     */
    public void stopAndRecreateIfNeeded() {
        // 检查是否有 iflow.js 进程在运行
        try {
            ProcessBuilder checkPb = new ProcessBuilder("bash", "-c",
                "ps aux | grep 'iflow.js' | grep -v grep | wc -l");
            checkPb.redirectErrorStream(true);
            Process checkProcess = checkPb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(checkProcess.getInputStream()));
            String count = reader.readLine();
            checkProcess.waitFor();
            
            if (count != null && !count.trim().equals("0")) {
                log.info("Found {} iflow process(es) running, stopping before SDK query", count.trim());
                stopExistingIflowProcess();
            }
        } catch (Exception e) {
            log.warn("Error checking iflow processes: {}", e.getMessage());
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
