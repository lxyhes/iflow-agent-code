package com.iflow.agent.config;

import com.iflow.agent.handler.ShellWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@EnableScheduling  // 启用定时任务支持，用于心跳机制
public class WebSocketConfig implements WebSocketConfigurer {

    @Bean
    public ShellWebSocketHandler shellWebSocketHandler() {
        return new ShellWebSocketHandler();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(shellWebSocketHandler(), "/shell")
                .setAllowedOrigins("*")
                .setHandshakeHandler(new org.springframework.web.socket.server.support.DefaultHandshakeHandler());
    }
}
