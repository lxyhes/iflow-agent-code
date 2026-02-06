package com.iflow.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * iFlow 进程管理器
 * 用于管理 iFlow CLI 进程的启动、停止和重启
 */
@Slf4j
@Service
public class IFlowProcessManager {

    private static final int DEFAULT_PORT = 8090;
    private static final String CONFIG_PATH = System.getProperty("user.home") + "/.iflow/settings.json";

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 重启 iFlow CLI 进程
     * @param model 模型名称
     */
    public void restartIFlowProcess(String model) {
        log.info("Restarting iFlow CLI process with model: {}", model);

        try {
            // 1. 更新 iFlow 配置文件
            updateIFlowConfig(model);

            // 2. 停止当前运行的 iFlow 进程
            stopIFlowProcess();

            // 3. 等待进程完全停止
            Thread.sleep(2000);

            // 4. 启动新的 iFlow 进程
            startIFlowProcess();

            log.info("iFlow CLI process restarted successfully with model: {}", model);

        } catch (Exception e) {
            log.error("Failed to restart iFlow process", e);
            throw new RuntimeException("Failed to restart iFlow process: " + e.getMessage(), e);
        }
    }

    /**
     * 更新 iFlow 配置文件中的模型设置
     * @param model 模型名称
     */
    private void updateIFlowConfig(String model) throws Exception {
        log.info("Updating iFlow config to model: {}", model);

        try {
            Path configPath = Paths.get(CONFIG_PATH);
            Map<String, Object> config = new HashMap<>();

            // 读取现有配置文件（如果存在）
            if (Files.exists(configPath)) {
                try {
                    config = objectMapper.readValue(configPath.toFile(), Map.class);
                    log.info("Loaded existing iFlow config from: {}", CONFIG_PATH);
                } catch (Exception e) {
                    log.warn("Failed to parse existing config, creating new one: {}", e.getMessage());
                    config = new HashMap<>();
                }
            } else {
                log.info("Config file not found, creating new one: {}", CONFIG_PATH);
                // 确保目录存在
                Files.createDirectories(configPath.getParent());
            }

            // 更新模型设置 - 使用正确的字段名 modelName
            config.put("modelName", model);

            // 保存配置文件
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(configPath.toFile(), config);
            log.info("iFlow config updated successfully (modelName: {})", model);

        } catch (Exception e) {
            log.error("Failed to update iFlow config", e);
            throw e;
        }
    }

    /**
     * 停止 iFlow CLI 进程
     */
    private void stopIFlowProcess() {
        log.info("Stopping iFlow CLI process...");

        try {
            // 查找占用默认端口的进程
            ProcessBuilder pb = new ProcessBuilder("sh", "-c", 
                "lsof -ti:" + DEFAULT_PORT);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );

            String line;
            StringBuilder pids = new StringBuilder();
            while ((line = reader.readLine()) != null) {
                pids.append(line).append(" ");
            }

            process.waitFor();

            String pidList = pids.toString().trim();
            if (!pidList.isEmpty()) {
                // 杀掉进程
                String killCommand = "kill -9 " + pidList;
                log.info("Killing iFlow processes: {}", killCommand);
                
                ProcessBuilder killPb = new ProcessBuilder("sh", "-c", killCommand);
                killPb.redirectErrorStream(true);
                Process killProcess = killPb.start();
                killProcess.waitFor();
                
                log.info("iFlow process stopped");
            } else {
                log.info("No iFlow process found running on port {}", DEFAULT_PORT);
            }

        } catch (Exception e) {
            log.warn("Error stopping iFlow process: {}", e.getMessage());
        }
    }

    /**
     * 启动 iFlow CLI 进程
     * 模型从配置文件中读取
     */
    private void startIFlowProcess() {
        log.info("Starting iFlow CLI process (model from config file)");

        try {
            String iflowPath = System.getenv().getOrDefault("IFLOW_PATH", "iflow");
            // 不再通过命令行指定模型，让 iFlow 从配置文件读取
            String command = String.format("%s --experimental-acp --port %d > /tmp/iflow-restart.log 2>&1 &",
                iflowPath, DEFAULT_PORT);

            log.info("Starting iFlow with command: {}", command);

            ProcessBuilder pb = new ProcessBuilder("sh", "-c", command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // 等待进程启动
            Thread.sleep(3000);

            log.info("iFlow CLI process started successfully");

        } catch (Exception e) {
            log.error("Failed to start iFlow process", e);
            throw new RuntimeException("Failed to start iFlow process: " + e.getMessage(), e);
        }
    }

    /**
     * 检查 iFlow 进程是否运行
     */
    public boolean isIFlowRunning() {
        try {
            ProcessBuilder pb = new ProcessBuilder("sh", "-c", 
                "lsof -ti:" + DEFAULT_PORT);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );

            String line = reader.readLine();
            process.waitFor();

            return line != null && !line.trim().isEmpty();

        } catch (Exception e) {
            log.warn("Error checking iFlow process: {}", e.getMessage());
            return false;
        }
    }
}