package com.iflow.agent.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.origins:http://localhost:5173,http://localhost:3001}")
    private String corsOrigins;

    @Value("${cors.dev-mode:false}")
    private boolean devMode;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (devMode) {
            registry.addMapping("/**")
                    .allowedOrigins("*")
                    .allowedMethods("*")
                    .allowedHeaders("*")
                    .allowCredentials(false);
        } else {
            List<String> origins = Arrays.asList(corsOrigins.split(","));
            registry.addMapping("/**")
                    .allowedOrigins(origins.toArray(new String[0]))
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
        }
    }
}
