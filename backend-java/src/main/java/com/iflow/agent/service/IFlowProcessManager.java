package com.iflow.agent.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;

/**
 * iFlow 进程管理器
 * 用于管理 iFlow CLI 进程的启动、停止和重启
 */
@Slf4j
@Service
public class IFlowProcessManager {

    private static final int DEFAULT_PORT = 8090;

    /**
     * 重启 iFlow CLI 进程
     * @param model 模型名称
     */
    public void restartIFlowProcess(String model) {
        log.info("Restarting iFlow CLI process with model: {}", model);

        try {
            // 1. 停止当前运行的 iFlow 进程
            stopIFlowProcess();

            // 2. 等待进程完全停止
            Thread.sleep(2000);

            // 3. 启动新的 iFlow 进程
            startIFlowProcess(model);

            log.info("iFlow CLI process restarted successfully with model: {}", model);

        } catch (Exception e) {
            log.error("Failed to restart iFlow process", e);
            throw new RuntimeException("Failed to restart iFlow process: " + e.getMessage(), e);
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
     * @param model 模型名称
     */
    private void startIFlowProcess(String model) {
        log.info("Starting iFlow CLI process with model: {}", model);

        try {
            String iflowPath = System.getenv().getOrDefault("IFLOW_PATH", "iflow");
            String command = String.format("%s --experimental-acp --port %d --model %s > /tmp/iflow-restart.log 2>&1 &",
                iflowPath, DEFAULT_PORT, model);

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