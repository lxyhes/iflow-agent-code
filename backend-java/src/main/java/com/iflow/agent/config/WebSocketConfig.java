package com.iflow.agent.config;

import com.iflow.agent.handler.InterviewWebSocketHandler;
import com.iflow.agent.handler.ShellWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@EnableScheduling  // 启用定时任务支持，用于心跳机制
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final InterviewWebSocketHandler interviewWebSocketHandler;

    @Bean
    public ShellWebSocketHandler shellWebSocketHandler() {
        return new ShellWebSocketHandler();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Shell WebSocket
        registry.addHandler(shellWebSocketHandler(), "/shell")
                .setAllowedOrigins("*")
                .setHandshakeHandler(new org.springframework.web.socket.server.support.DefaultHandshakeHandler());

        // Interview WebSocket
        registry.addHandler(interviewWebSocketHandler, "/api/interview/ws/*")
                .setAllowedOrigins("*")
                .setHandshakeHandler(new org.springframework.web.socket.server.support.DefaultHandshakeHandler());
    }
}
