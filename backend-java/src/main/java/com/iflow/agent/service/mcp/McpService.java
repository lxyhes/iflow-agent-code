package com.iflow.agent.service.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * MCP 服务器配置服务
 * 读取和管理 iFlow 的 MCP 服务器配置
 */
@Slf4j
@Service
public class McpService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // 内存中缓存的 MCP 服务器配置
    private List<Map<String, Object>> cachedMcpServers = new ArrayList<>();
    
    /**
     * 获取 iFlow 配置文件路径
     */
    private Path getIFlowConfigPath() {
        String homeDir = System.getProperty("user.home");
        return Paths.get(homeDir, ".iflow", "settings.json");
    }
    
    /**
     * 从 iFlow 配置文件读取 MCP 服务器列表
     */
    public List<Map<String, Object>> getMcpServers() {
        Path configPath = getIFlowConfigPath();
        
        try {
            if (!Files.exists(configPath)) {
                log.info("iFlow 配置文件不存在: {}", configPath);
                return new ArrayList<>();
            }
            
            String content = Files.readString(configPath);
            JsonNode root = objectMapper.readTree(content);
            JsonNode mcpServersNode = root.get("mcpServers");
            
            if (mcpServersNode == null || !mcpServersNode.isObject()) {
                log.info("iFlow 配置文件中没有 mcpServers 配置");
                return new ArrayList<>();
            }
            
            List<Map<String, Object>> servers = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = mcpServersNode.fields();
            
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String serverName = entry.getKey();
                JsonNode serverConfig = entry.getValue();
                
                if (serverConfig.isObject()) {
                    Map<String, Object> server = new LinkedHashMap<>();
                    server.put("name", serverName);
                    server.put("type", getTextOrEmpty(serverConfig, "type", "stdio"));
                    
                    // 配置详情
                    Map<String, Object> config = new LinkedHashMap<>();
                    config.put("command", getTextOrEmpty(serverConfig, "command", ""));
                    config.put("args", getListOrEmpty(serverConfig, "args"));
                    config.put("env", getMapOrEmpty(serverConfig, "env"));
                    config.put("url", getTextOrEmpty(serverConfig, "url", ""));
                    config.put("headers", getMapOrEmpty(serverConfig, "headers"));
                    config.put("timeout", getIntOrEmpty(serverConfig, "timeout", 30000));
                    
                    server.put("config", config);
                    servers.add(server);
                }
            }
            
            log.info("从 iFlow 配置读取到 {} 个 MCP 服务器", servers.size());
            return servers;
            
        } catch (IOException e) {
            log.error("读取 iFlow MCP 配置失败", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * 同步 MCP 服务器配置到内存缓存
     */
    public int syncMcpServers() {
        List<Map<String, Object>> servers = getMcpServers();
        this.cachedMcpServers = servers;
        log.info("已同步 {} 个 MCP 服务器到内存缓存", servers.size());
        return servers.size();
    }
    
    /**
     * 获取缓存的 MCP 服务器配置
     */
    public List<Map<String, Object>> getCachedMcpServers() {
        return new ArrayList<>(cachedMcpServers);
    }
    
    /**
     * 测试 MCP 服务器连接
     */
    public Map<String, Object> testMcpServer(String serverId) {
        log.info("测试 MCP 服务器连接: {}", serverId);
        
        // 查找服务器
        Map<String, Object> server = cachedMcpServers.stream()
                .filter(s -> serverId.equals(s.get("name")))
                .findFirst()
                .orElse(null);
        
        if (server == null) {
            return Map.of(
                    "success", false,
                    "message", "未找到服务器: " + serverId
            );
        }
        
        // 模拟测试（实际测试需要通过 iFlow SDK）
        return Map.of(
                "success", true,
                "message", "服务器配置有效",
                "server", server
        );
    }
    
    /**
     * 获取 MCP 服务器可用工具列表
     */
    public List<Map<String, Object>> getMcpServerTools(String serverId) {
        log.info("获取 MCP 服务器工具: {}", serverId);
        
        // 查找服务器
        Map<String, Object> server = cachedMcpServers.stream()
                .filter(s -> serverId.equals(s.get("name")))
                .findFirst()
                .orElse(null);
        
        if (server == null) {
            return new ArrayList<>();
        }
        
        // 返回模拟的工具列表（实际需要通过 iFlow SDK 查询）
        return new ArrayList<>();
    }

    /**
     * 添加 MCP 服务器到配置文件
     */
    public boolean addMcpServer(Map<String, Object> serverData) {
        String name = (String) serverData.get("name");
        if (name == null || name.isEmpty()) {
            log.error("MCP 服务器名称不能为空");
            return false;
        }

        try {
            Path configPath = getIFlowConfigPath();
            
            // 确保目录存在
            Files.createDirectories(configPath.getParent());
            
            // 读取现有配置
            Map<String, Object> config = new LinkedHashMap<>();
            if (Files.exists(configPath)) {
                String content = Files.readString(configPath);
                config = objectMapper.readValue(content, LinkedHashMap.class);
            }
            
            // 获取或创建 mcpServers 节点
            Map<String, Object> mcpServers = (Map<String, Object>) config.computeIfAbsent(
                    "mcpServers", k -> new LinkedHashMap<String, Object>());
            
            // 构建服务器配置
            Map<String, Object> serverConfig = new LinkedHashMap<>();
            String type = (String) serverData.getOrDefault("type", "stdio");
            serverConfig.put("type", type);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> configData = (Map<String, Object>) serverData.get("config");
            if (configData != null) {
                if (configData.containsKey("command")) {
                    serverConfig.put("command", configData.get("command"));
                }
                if (configData.containsKey("args")) {
                    serverConfig.put("args", configData.get("args"));
                }
                if (configData.containsKey("env")) {
                    serverConfig.put("env", configData.get("env"));
                }
                if (configData.containsKey("url")) {
                    serverConfig.put("url", configData.get("url"));
                }
                if (configData.containsKey("headers")) {
                    serverConfig.put("headers", configData.get("headers"));
                }
                if (configData.containsKey("timeout")) {
                    serverConfig.put("timeout", configData.get("timeout"));
                }
            }
            
            // 直接从顶层属性读取
            if (serverData.containsKey("command")) {
                serverConfig.put("command", serverData.get("command"));
            }
            if (serverData.containsKey("args")) {
                serverConfig.put("args", serverData.get("args"));
            }
            if (serverData.containsKey("env")) {
                serverConfig.put("env", serverData.get("env"));
            }
            
            mcpServers.put(name, serverConfig);
            
            // 保存配置
            String jsonContent = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(config);
            Files.writeString(configPath, jsonContent);
            
            // 更新缓存
            syncMcpServers();
            
            log.info("已添加 MCP 服务器: {}", name);
            return true;
            
        } catch (Exception e) {
            log.error("添加 MCP 服务器失败", e);
            return false;
        }
    }

    /**
     * 删除 MCP 服务器
     */
    public boolean removeMcpServer(String serverName) {
        try {
            Path configPath = getIFlowConfigPath();
            
            if (!Files.exists(configPath)) {
                log.warn("配置文件不存在");
                return false;
            }
            
            String content = Files.readString(configPath);
            Map<String, Object> config = objectMapper.readValue(content, LinkedHashMap.class);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> mcpServers = (Map<String, Object>) config.get("mcpServers");
            
            if (mcpServers == null || !mcpServers.containsKey(serverName)) {
                log.warn("MCP 服务器不存在: {}", serverName);
                return false;
            }
            
            mcpServers.remove(serverName);
            
            // 保存配置
            String jsonContent = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(config);
            Files.writeString(configPath, jsonContent);
            
            // 更新缓存
            syncMcpServers();
            
            log.info("已删除 MCP 服务器: {}", serverName);
            return true;
            
        } catch (Exception e) {
            log.error("删除 MCP 服务器失败", e);
            return false;
        }
    }

    /**
     * 读取 MCP 配置文件
     */
    public Map<String, Object> readMcpConfig() {
        try {
            Path configPath = getIFlowConfigPath();
            
            if (!Files.exists(configPath)) {
                return new LinkedHashMap<>();
            }
            
            String content = Files.readString(configPath);
            Map<String, Object> config = objectMapper.readValue(content, LinkedHashMap.class);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> mcpServers = (Map<String, Object>) config.get("mcpServers");
            
            return mcpServers != null ? mcpServers : new LinkedHashMap<>();
            
        } catch (Exception e) {
            log.error("读取 MCP 配置失败", e);
            return new LinkedHashMap<>();
        }
    }
    
    // ========== 辅助方法 ==========
    
    private String getTextOrEmpty(JsonNode node, String field, String defaultValue) {
        JsonNode fieldNode = node.get(field);
        return fieldNode != null && fieldNode.isTextual() ? fieldNode.asText() : defaultValue;
    }
    
    private int getIntOrEmpty(JsonNode node, String field, int defaultValue) {
        JsonNode fieldNode = node.get(field);
        return fieldNode != null && fieldNode.isInt() ? fieldNode.asInt() : defaultValue;
    }
    
    private List<String> getListOrEmpty(JsonNode node, String field) {
        JsonNode fieldNode = node.get(field);
        if (fieldNode != null && fieldNode.isArray()) {
            List<String> list = new ArrayList<>();
            for (JsonNode item : fieldNode) {
                list.add(item.asText());
            }
            return list;
        }
        return new ArrayList<>();
    }
    
    private Map<String, Object> getMapOrEmpty(JsonNode node, String field) {
        JsonNode fieldNode = node.get(field);
        if (fieldNode != null && fieldNode.isObject()) {
            Map<String, Object> map = new LinkedHashMap<>();
            Iterator<Map.Entry<String, JsonNode>> fields = fieldNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                map.put(entry.getKey(), entry.getValue().asText());
            }
            return map;
        }
        return new LinkedHashMap<>();
    }
}
