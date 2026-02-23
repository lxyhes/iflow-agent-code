package com.iflow.agent.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * WebUI 安全配置
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class WebUiSecurityConfig {

    private final WebUiProperties webUiProperties;

    /**
     * WebUI 安全过滤器链
     */
    @Bean
    public SecurityFilterChain webUiFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/**", "/ws/**") // 只保护 API 和 WebSocket
            .authorizeHttpRequests(auth -> auth
                // 公开端点
                .requestMatchers(
                    "/api/auth/**",
                    "/api/health",
                    "/api/public/**",
                    "/api/webui/status"
                ).permitAll()
                // 其他 API 需要认证
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(webUiProperties.getMaxConcurrentSessions())
                .maxSessionsPreventsLogin(false) // 允许新登录，挤掉旧会话
                .expiredUrl("/api/auth/expired")
            )
            .cors(cors -> cors.configurationSource(webUiCorsConfigurationSource()))
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/auth/**", "/api/webui/**")
            );

        return http.build();
    }

    /**
     * CORS 配置
     */
    @Bean
    public CorsConfigurationSource webUiCorsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 允许的源
        if (webUiProperties.isRemoteAccess()) {
            configuration.setAllowedOriginPatterns(List.of("*"));
        } else {
            configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173"
            ));
        }

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept",
            "Origin"
        ));
        configuration.setExposedHeaders(List.of("X-Auth-Token"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        source.registerCorsConfiguration("/ws/**", configuration);

        return source;
    }
}
