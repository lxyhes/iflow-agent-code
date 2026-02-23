package com.iflow.agent.service.agent;

import com.iflow.agent.dto.AgentDto.DiscoveredAgent;
import com.iflow.agent.dto.AgentDto.DiscoveryResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Agent 检测服务
 * 负责扫描和检测本地已安装的 CLI AI 工具
 */
@Service
@Slf4j
public class AgentDetectionService {

    /**
     * 支持的 Agent 类型及其检测命令
     */
    private static final Map<String, List<String>> AGENT_detection_COMMANDS = Map.of(
        "claude-code", List.of("claude", "--version"),
        "gemini-cli", List.of("gemini", "--version"),
        "qwen-code", List.of("qwen", "--version"),
        "codex", List.of("codex", "--version"),
        "goose", List.of("goose", "--version"),
        "auggie", List.of("auggie", "--version"),
        "iflow", List.of("iflow", "--version")
    );

    /**
     * 检测所有可用的 Agent
     * @return 发现结果
     */
    public DiscoveryResult discoverAllAgents() {
        log.info("开始检测本地 AI Agent...");
        
        List<DiscoveredAgent> discoveredAgents = new ArrayList<>();
        int foundCount = 0;
        int registeredCount = 0;

        for (Map.Entry<String, List<String>> entry : AGENT_detection_COMMANDS.entrySet()) {
            String type = entry.getKey();
            List<String> command = entry.getValue();

            try {
                // 检测 CLI 是否存在
                ProcessBuilder processBuilder = new ProcessBuilder(command);
                processBuilder.redirectErrorStream(true);
                Process process = processBuilder.start();

                String version = readVersion(process);
                String cliPath = findCliPath(type);

                if (cliPath != null) {
                    foundCount++;
                    discoveredAgents.add(new DiscoveredAgent(
                        type,
                        cliPath,
                        version,
                        false,
                        null
                    ));
                    log.info("发现 Agent: {} (路径：{}, 版本：{})", type, cliPath, version);
                }

            } catch (IOException e) {
                log.debug("未检测到 Agent: {} - {}", type, e.getMessage());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("检测 Agent 被中断：{}", type);
            }
        }

        DiscoveryResult result = new DiscoveryResult(discoveredAgents, foundCount, registeredCount);
        log.info("检测完成：发现 {} 个 Agent", foundCount);
        return result;
    }

    /**
     * 检测特定类型的 Agent
     */
    public DiscoveredAgent detectAgent(String type) {
        List<String> command = AGENT_detection_COMMANDS.get(type);
        if (command == null) {
            throw new IllegalArgumentException("不支持的 Agent 类型：" + type);
        }

        try {
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            String version = readVersion(process);
            String cliPath = findCliPath(type);

            if (cliPath != null) {
                return new DiscoveredAgent(type, cliPath, version, false, null);
            }

            return null;

        } catch (IOException | InterruptedException e) {
            log.debug("未检测到 Agent: {} - {}", type, e.getMessage());
            return null;
        }
    }

    /**
     * 从进程输出中读取版本号
     */
    private String readVersion(Process process) throws IOException, InterruptedException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line = reader.readLine();
            if (line != null) {
                // 提取版本信息 (通常是输出的第一行)
                return line.trim();
            }
        }
        process.waitFor();
        return "unknown";
    }

    /**
     * 查找 CLI 工具的路径
     */
    private String findCliPath(String type) {
        try {
            ProcessBuilder processBuilder;
            if (isWindows()) {
                processBuilder = new ProcessBuilder("where", type);
            } else {
                processBuilder = new ProcessBuilder("which", type);
            }

            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String path = reader.readLine();
                if (path != null && !path.isEmpty()) {
                    return path.trim();
                }
            }

            process.waitFor();
        } catch (IOException | InterruptedException e) {
            log.debug("无法找到 {} 的路径：{}", type, e.getMessage());
        }

        return null;
    }

    /**
     * 使用自定义命令检测 Agent
     */
    public DiscoveredAgent detectWithCommand(String type, List<String> command) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            String version = readVersion(process);
            String cliPath = command.get(0);

            return new DiscoveredAgent(type, cliPath, version, false, null);

        } catch (IOException | InterruptedException e) {
            log.debug("自定义检测失败：{} - {}", type, e.getMessage());
            return null;
        }
    }

    /**
     * 批量检测多个 Agent
     */
    public List<DiscoveredAgent> detectMultipleAgents(List<String> types) {
        List<DiscoveredAgent> results = new ArrayList<>();
        
        for (String type : types) {
            DiscoveredAgent agent = detectAgent(type);
            if (agent != null) {
                results.add(agent);
            }
        }

        return results;
    }

    /**
     * 检查是否是 Windows 系统
     */
    private boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }

    /**
     * 获取所有支持的 Agent 类型
     */
    public List<String> getSupportedAgentTypes() {
        return new ArrayList<>(AGENT_detection_COMMANDS.keySet());
    }
}
