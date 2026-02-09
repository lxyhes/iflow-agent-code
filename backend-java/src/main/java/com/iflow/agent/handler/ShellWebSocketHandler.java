package com.iflow.agent.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pty4j.PtyProcess;
import com.pty4j.PtyProcessBuilder;
import com.pty4j.WinSize;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

@Slf4j
public class ShellWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, TerminalSession> sessions = new ConcurrentHashMap<>();
    private final ExecutorService executorService = Executors.newFixedThreadPool(20);
    private ScheduledExecutorService heartbeatScheduler;
    private static final long HEARTBEAT_CHECK_INTERVAL = 15000;
    private static final int BUFFER_SIZE = 16384; // 16KB buffer

    @PostConstruct
    public void init() {
        heartbeatScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread thread = new Thread(r, "shell-heartbeat-thread");
            thread.setDaemon(true);
            return thread;
        });

        heartbeatScheduler.scheduleAtFixedRate(
            this::checkHeartbeat,
            HEARTBEAT_CHECK_INTERVAL,
            HEARTBEAT_CHECK_INTERVAL,
            TimeUnit.MILLISECONDS
        );

        log.info("[Shell] Heartbeat scheduler initialized");
    }

    @PreDestroy
    public void destroy() {
        log.info("[Shell] Shutting down heartbeat scheduler");
        if (heartbeatScheduler != null) {
            heartbeatScheduler.shutdown();
            try {
                if (!heartbeatScheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    heartbeatScheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                heartbeatScheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }

        sessions.keySet().forEach(this::closeSession);

        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }

        log.info("[Shell] ShellWebSocketHandler destroyed");
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("[Shell] WebSocket connection established: {}", session.getId());
        sendHeartbeat(session);
    }

    private void checkHeartbeat() {
        if (sessions.isEmpty()) {
            return;
        }

        long currentTime = System.currentTimeMillis();
        sessions.forEach((sessionId, terminalSession) -> {
            WebSocketSession session = terminalSession.getWsSession();
            if (session != null && session.isOpen()) {
                try {
                    Map<String, Object> heartbeat = new HashMap<>();
                    heartbeat.put("type", "heartbeat");
                    heartbeat.put("timestamp", currentTime);
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(heartbeat)));
                } catch (Exception e) {
                    log.error("[Shell] Failed to send heartbeat to session {}", sessionId, e);
                    closeSession(sessionId);
                }
            } else {
                closeSession(sessionId);
            }
        });
    }

    private void sendHeartbeat(WebSocketSession session) {
        try {
            Map<String, Object> heartbeat = new HashMap<>();
            heartbeat.put("type", "heartbeat");
            heartbeat.put("timestamp", System.currentTimeMillis());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(heartbeat)));
        } catch (Exception e) {
            log.error("[Shell] Failed to send initial heartbeat", e);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode jsonNode = objectMapper.readTree(message.getPayload());
        String type = jsonNode.get("type").asText();

        if ("init".equals(type)) {
            handleInit(session, jsonNode);
        } else if ("input".equals(type)) {
            handleInput(session, jsonNode);
        } else if ("resize".equals(type)) {
            handleResize(session, jsonNode);
        }
    }

    private void handleResize(WebSocketSession session, JsonNode data) {
        String sessionId = session.getId();
        TerminalSession terminalSession = sessions.get(sessionId);
        if (terminalSession != null && data.has("cols") && data.has("rows")) {
            int cols = data.get("cols").asInt();
            int rows = data.get("rows").asInt();
            try {
                if (terminalSession.getProcess() instanceof PtyProcess) {
                    ((PtyProcess) terminalSession.getProcess()).setWinSize(new WinSize(cols, rows));
                    log.debug("[Shell] Resized session {} to {}x{}", sessionId, cols, rows);
                }
            } catch (Exception e) {
                log.error("[Shell] Failed to resize session {}", sessionId, e);
            }
        }
    }

    private void handleInit(WebSocketSession session, JsonNode data) {
        String projectPath = data.has("projectPath") ? data.get("projectPath").asText() : System.getProperty("user.dir");
        log.info("[Shell] Initializing shell in: {}", projectPath);

        if (!session.isOpen()) {
            log.error("[Shell] Session {} is already closed", session.getId());
            return;
        }

        File projectDir = new File(projectPath);
        if (!projectDir.exists() || !projectDir.isDirectory()) {
            String errorMsg = "Error: Project path does not exist or is not a directory: " + projectPath;
            log.error("[Shell] {}", errorMsg);
            sendOutput(session, errorMsg + "\r\n");
            return;
        }

        try {
            String[] cmd;
            String os = System.getProperty("os.name").toLowerCase();
            boolean isWindows = os.contains("win");
            Map<String, String> envs = new HashMap<>(System.getenv());
            envs.put("TERM", "xterm-256color");
            envs.put("LANG", "en_US.UTF-8");

            if (isWindows) {
                // Windows: Use PowerShell with NoLogo and Bypass policy for better compatibility
                cmd = new String[]{"powershell.exe", "-NoLogo", "-ExecutionPolicy", "Bypass"};
            } else {
                // macOS/Linux: Use bash or zsh
                String shell = envs.getOrDefault("SHELL", "/bin/bash");
                cmd = new String[]{shell, "-i"};
            }

            PtyProcessBuilder ptyBuilder = new PtyProcessBuilder()
                    .setCommand(cmd)
                    .setDirectory(projectPath)
                    .setEnvironment(envs)
                    .setConsole(false)
                    .setUseWinConPty(true);

            PtyProcess process = ptyBuilder.start();

            // Initial size if provided
            if (data.has("cols") && data.has("rows")) {
                process.setWinSize(new WinSize(data.get("cols").asInt(), data.get("rows").asInt()));
            }

            Thread.sleep(100);
            if (!process.isAlive()) {
                int exitCode = process.exitValue();
                String errorMsg = "Error: Shell process exited immediately with code " + exitCode;
                log.error("[Shell] {}", errorMsg);
                sendOutput(session, errorMsg + "\r\n");
                return;
            }

            TerminalSession terminalSession = new TerminalSession(process, session, isWindows);
            sessions.put(session.getId(), terminalSession);

            executorService.submit(() -> readOutput(terminalSession));

            // Inject Shims and send welcome message
            executorService.submit(() -> {
                try {
                    Thread.sleep(500); // Wait for shell to be ready
                    
                    if (isWindows) {
                        // 注入兼容层：模拟 Unix 常用指令
                        // touch: 支持创建文件或更新时间戳
                        // grep: 映射到 Select-String
                        // which: 映射到 Get-Command
                        // ll / la: 常见的快捷指令
                        String shims = 
                            "function touch { foreach($file in $args) { if(Test-Path $file) { (Get-Item $file).LastWriteTime = Get-Date } else { New-Item -ItemType File -Path $file } } }; " +
                            "function grep { Select-String $args }; " +
                            "function which { Get-Command $args | Select-Object -ExpandProperty Source }; " +
                            "function ll { Get-ChildItem -Force | Format-Table Mode, LastWriteTime, Length, Name }; " +
                            "function la { Get-ChildItem -Force }; " +
                            "Clear-Host\r\n";
                        terminalSession.write(shims);
                        sendOutput(session, "\r\n\u001b[32m✓ Terminal Connected (PTY + PowerShell + Unix Shims)\u001b[0m\r\n");
                    } else {
                        sendOutput(session, "\r\n\u001b[32m✓ Terminal Connected (PTY)\u001b[0m\r\n");
                    }
                } catch (Exception e) {
                    log.error("[Shell] Failed to initialize shims", e);
                }
            });

        } catch (Exception e) {
            log.error("[Shell] Failed to start shell", e);
            sendOutput(session, "\u001b[31m✗ Error starting shell: " + e.getMessage() + "\u001b[0m\r\n");
            closeSession(session.getId());
        }
    }

    private void handleInput(WebSocketSession session, JsonNode data) {
        String sessionId = session.getId();

        TerminalSession terminalSession = sessions.get(sessionId);
        if (terminalSession == null) {
            log.warn("[Shell] No terminal session found for session {}", sessionId);
            return;
        }

        if (!data.has("data")) {
            log.warn("[Shell] Invalid input message from session {}: missing 'data' field", sessionId);
            return;
        }

        String input = data.get("data").asText();
        // With PTY, we send raw input. PTY handles CRLF conversion if needed.
        
        log.debug("[Shell] Received input from session {}: {}", sessionId, input.replace("\r", "\\r").replace("\n", "\\n"));

        if (!terminalSession.getProcess().isAlive()) {
            log.warn("[Shell] Process for session {} is not alive", sessionId);
            sendOutput(session, "\r\n\u001b[31m✗ Terminal process has terminated. Please restart the terminal.\u001b[0m\r\n");
            return;
        }

        try {
            terminalSession.write(input);
        } catch (Exception e) {
            log.error("[Shell] Error writing input to process for session {}", sessionId, e);
            sendOutput(session, "\r\n\u001b[31m✗ Error: Failed to write to terminal.\u001b[0m\r\n");
        }
    }

    private void readOutput(TerminalSession terminalSession) {
        String sessionId = terminalSession.getWsSession().getId();
        Process process = terminalSession.getProcess();
        WebSocketSession wsSession = terminalSession.getWsSession();
        boolean isWindows = terminalSession.isWindows();

        // PTY usually outputs UTF-8, but let's be careful on Windows with older pty4j versions
        // Modern pty4j with ConPTY should be UTF-8
        // If garbage characters appear, we might need to switch back to GBK for Windows
        // But Pty4J usually handles this. Let's try UTF-8 first.
        Charset charset = StandardCharsets.UTF_8; 
        byte[] buffer = new byte[BUFFER_SIZE];

        log.info("[Shell] Starting output reader for session {} (Windows: {})", sessionId, isWindows);

        try (InputStream inputStream = process.getInputStream()) {
            int n;
            while (wsSession.isOpen() && process.isAlive() && (n = inputStream.read(buffer)) != -1) {
                // PTY output is raw bytes, send directly or as string
                // Xterm expects string usually
                String text = new String(buffer, 0, n, charset);
                sendOutput(wsSession, text, false); // No newline normalization needed for PTY
            }
        } catch (IOException e) {
            if (!wsSession.isOpen()) {
                log.debug("[Shell] WebSocket session {} closed, stopping output reader", sessionId);
            } else {
                log.error("[Shell] Error reading output for session {}", sessionId, e);
            }
        } finally {
            log.info("[Shell] Output reader finished for session {}", sessionId);
            if (process.isAlive()) {
                log.warn("[Shell] Process still alive for session {}, destroying it", sessionId);
                process.destroyForcibly();
            }
            closeSession(sessionId);
        }
    }

    private void sendOutput(WebSocketSession session, String text, boolean normalize) {
        if (session == null || !session.isOpen()) {
            log.debug("[Shell] Cannot send output: session is null or closed");
            return;
        }

        try {
            Map<String, Object> response = new HashMap<>();
            response.put("type", "output");
            response.put("data", text);
            response.put("timestamp", System.currentTimeMillis());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (IOException e) {
            log.error("[Shell] Error sending output to session {}", session.getId(), e);
            closeSession(session.getId());
        }
    }

    private void sendOutput(WebSocketSession session, String text) {
        sendOutput(session, text, false);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = session.getId();
        log.info("[Shell] WebSocket connection closed: {}, status: {}", sessionId, status);
        closeSession(sessionId);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        String sessionId = session.getId();
        log.error("[Shell] WebSocket transport error for session {}", sessionId, exception);
        closeSession(sessionId);
    }

    private void closeSession(String sessionId) {
        TerminalSession terminalSession = sessions.remove(sessionId);
        if (terminalSession != null) {
            log.info("[Shell] Closing terminal session {}", sessionId);
            terminalSession.close();
        }
    }

    private static class TerminalSession {
        private final Process process;
        private final WebSocketSession wsSession;
        private final OutputStream outputStream;
        private final boolean isWindows;
        private volatile boolean isClosed = false;

        public TerminalSession(Process process, WebSocketSession wsSession, boolean isWindows) {
            this.process = process;
            this.wsSession = wsSession;
            this.isWindows = isWindows;
            this.outputStream = process.getOutputStream();
        }

        public synchronized void write(String data) {
            if (isClosed) {
                log.warn("[Shell] Attempted to write to closed terminal session");
                return;
            }

            try {
                // PtyProcess expects bytes. 
                // Using UTF-8 for input should be safe for PTY.
                outputStream.write(data.getBytes(StandardCharsets.UTF_8));
                outputStream.flush();
            } catch (IOException e) {
                log.error("[Shell] Error writing to process", e);
                isClosed = true;
                throw new RuntimeException("Failed to write to process", e);
            }
        }

        public Process getProcess() {
            return process;
        }

        public WebSocketSession getWsSession() {
            return wsSession;
        }

        public boolean isWindows() {
            return isWindows;
        }

        public boolean isClosed() {
            return isClosed;
        }

        public synchronized void close() {
            if (isClosed) {
                return;
            }

            isClosed = true;

            try {
                if (outputStream != null) {
                    outputStream.close();
                }
            } catch (IOException e) {
                log.warn("[Shell] Error closing output stream", e);
            }

            if (process != null && process.isAlive()) {
                log.info("[Shell] Destroying process");
                process.destroyForcibly();
                try {
                    if (!process.waitFor(5, TimeUnit.SECONDS)) {
                        log.warn("[Shell] Process did not terminate within timeout");
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("[Shell] Interrupted while waiting for process to terminate");
                }
            }
        }
    }
}