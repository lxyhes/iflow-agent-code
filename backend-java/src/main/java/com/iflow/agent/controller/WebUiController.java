package com.iflow.agent.controller;

import com.iflow.agent.config.WebUiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.*;

/**
 * WebUI 远程访问控制器
 */
@RestController
@RequestMapping("/api/webui")
@RequiredArgsConstructor
@Slf4j
public class WebUiController {

    private final WebUiProperties webUiProperties;

    /**
     * 获取 WebUI 状态
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getWebUiStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("enabled", webUiProperties.isEnabled());
        status.put("remoteAccess", webUiProperties.isRemoteAccess());
        status.put("host", webUiProperties.getHost());
        status.put("port", webUiProperties.getPort());
        status.put("httpsEnabled", webUiProperties.isHttpsEnabled());
        status.put("pwaEnabled", webUiProperties.isPwaEnabled());
        status.put("appName", webUiProperties.getAppName());
        status.put("maxConcurrentSessions", webUiProperties.getMaxConcurrentSessions());
        status.put("sessionTimeout", webUiProperties.getSessionTimeout() / 1000 / 60 + "分钟");
        
        return ResponseEntity.ok(status);
    }

    /**
     * 获取访问地址
     */
    @GetMapping("/urls")
    public ResponseEntity<Map<String, Object>> getAccessUrls() {
        Map<String, Object> urls = new HashMap<>();
        
        String protocol = webUiProperties.isHttpsEnabled() ? "https" : "http";
        String localUrl = protocol + "://localhost:" + webUiProperties.getPort();
        urls.put("local", localUrl);

        if (webUiProperties.isRemoteAccess()) {
            try {
                // 获取本地 IP
                String localIp = getLocalIpAddress();
                urls.put("lan", protocol + "://" + localIp + ":" + webUiProperties.getPort());

                // 获取主机名
                String hostname = InetAddress.getLocalHost().getHostName();
                urls.put("hostname", protocol + "://" + hostname + ":" + webUiProperties.getPort());
            } catch (UnknownHostException | SocketException e) {
                urls.put("lan", "无法获取本地 IP");
            }
        }
        
        urls.put("remoteAccessEnabled", webUiProperties.isRemoteAccess());
        
        return ResponseEntity.ok(urls);
    }

    /**
     * 检查 IP 是否在白名单中
     */
    @GetMapping("/check-ip")
    public ResponseEntity<Map<String, Object>> checkIp(@RequestParam String ip) {
        Map<String, Object> result = new HashMap<>();
        result.put("ip", ip);
        
        if (webUiProperties.getIpWhitelist().isEmpty()) {
            result.put("allowed", true);
            result.put("message", "未设置 IP 白名单，允许所有 IP");
        } else {
            boolean allowed = webUiProperties.getIpWhitelist().contains(ip);
            result.put("allowed", allowed);
            result.put("message", allowed ? "IP 在白名单中" : "IP 不在白名单中");
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * 获取网络信息
     */
    @GetMapping("/network-info")
    public ResponseEntity<Map<String, Object>> getNetworkInfo() {
        Map<String, Object> info = new HashMap<>();

        try {
            info.put("localIp", getLocalIpAddress());
            info.put("hostname", InetAddress.getLocalHost().getHostName());
            info.put("remoteAccessEnabled", webUiProperties.isRemoteAccess());
            info.put("ipWhitelist", webUiProperties.getIpWhitelist());
            info.put("whitelistEmpty", webUiProperties.getIpWhitelist().isEmpty());
        } catch (UnknownHostException | SocketException e) {
            info.put("error", "无法获取网络信息：" + e.getMessage());
        }

        return ResponseEntity.ok(info);
    }

    /**
     * 更新 WebUI 配置
     */
    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @RequestBody Map<String, Object> config) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            if (config.containsKey("remoteAccess")) {
                webUiProperties.setRemoteAccess((Boolean) config.get("remoteAccess"));
            }
            if (config.containsKey("ipWhitelist") && config.get("ipWhitelist") instanceof List) {
                webUiProperties.setIpWhitelist(
                    (List<String>) config.get("ipWhitelist")
                );
            }
            if (config.containsKey("maxConcurrentSessions")) {
                webUiProperties.setMaxConcurrentSessions(
                    (Integer) config.get("maxConcurrentSessions")
                );
            }
            if (config.containsKey("sessionTimeout")) {
                webUiProperties.setSessionTimeout((Long) config.get("sessionTimeout"));
            }
            
            result.put("success", true);
            result.put("message", "配置已更新");
            result.put("config", getWebUiStatus().getBody());
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "更新配置失败：" + e.getMessage());
        }
        
        return ResponseEntity.ok(result);
    }

    /**
     * 获取启动命令
     */
    @GetMapping("/startup-commands")
    public ResponseEntity<Map<String, List<String>>> getStartupCommands() {
        Map<String, List<String>> commands = new HashMap<>();
        
        String protocol = webUiProperties.isHttpsEnabled() ? "https" : "http";
        String jarCommand = String.format(
            "java -jar agent-backend.jar --webui.remote-access=%s --webui.host=0.0.0.0 --webui.port=%d",
            webUiProperties.isRemoteAccess(),
            webUiProperties.getPort()
        );
        
        List<String> linuxCommands = Arrays.asList(
            "# 基本启动 (本地访问)",
            "java -jar agent-backend.jar",
            "",
            "# 远程访问 (局域网)",
            "java -jar agent-backend.jar --webui.remote-access=true --webui.host=0.0.0.0",
            "",
            "# 自定义端口",
            "java -jar agent-backend.jar --webui.port=8888",
            "",
            "# 带 IP 白名单",
            "java -jar agent-backend.jar --webui.remote-access=true --webui.ip-whitelist=192.168.1.0/24"
        );
        
        List<String> windowsCommands = Arrays.asList(
            "REM 基本启动 (本地访问)",
            "java -jar agent-backend.jar",
            "",
            "REM 远程访问 (局域网)",
            "java -jar agent-backend.jar --webui.remote-access=true --webui.host=0.0.0.0",
            "",
            "REM 自定义端口",
            "java -jar agent-backend.jar --webui.port=8888"
        );
        
        commands.put("linux", linuxCommands);
        commands.put("windows", windowsCommands);
        
        return ResponseEntity.ok(commands);
    }

    /**
     * 获取本地 IP 地址
     */
    private String getLocalIpAddress() throws UnknownHostException, SocketException {
        Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();

        while (networkInterfaces.hasMoreElements()) {
            NetworkInterface ni = networkInterfaces.nextElement();
            Enumeration<InetAddress> niAddresses = ni.getInetAddresses();

            while (niAddresses.hasMoreElements()) {
                InetAddress address = niAddresses.nextElement();
                if (!address.isLoopbackAddress() && !address.isAnyLocalAddress()) {
                    String ip = address.getHostAddress();
                    if (ip.matches("\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}")) {
                        return ip;
                    }
                }
            }
        }

        return InetAddress.getLocalHost().getHostAddress();
    }
}
