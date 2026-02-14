package com.iflow.agent.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

/**
 * API 请求日志过滤器
 * 记录所有请求的接口、参数和返回数据
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LoggingConfig implements Filter {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        
        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String requestId = java.util.UUID.randomUUID().toString().substring(0, 8);
        long startTime = System.currentTimeMillis();

        log.info("=".repeat(80));
        log.info("📥 [{}] 请求开始", requestId);
        log.info("   方法: {}", httpRequest.getMethod());
        log.info("   路径: {}", httpRequest.getRequestURI());
        log.info("   完整URL: {}", httpRequest.getRequestURL());

        // 记录查询参数
        Map<String, String> queryParams = new HashMap<>();
        Enumeration<String> paramNames = httpRequest.getParameterNames();
        while (paramNames.hasMoreElements()) {
            String name = paramNames.nextElement();
            String value = httpRequest.getParameter(name);
            queryParams.put(name, value);
        }
        if (!queryParams.isEmpty()) {
            try {
                log.info("   查询参数: {}", objectMapper.writeValueAsString(queryParams));
            } catch (Exception e) {
                log.info("   查询参数: {}", queryParams);
            }
        }

        // 包装请求以便读取请求体
        RequestWrapper wrappedRequest = new RequestWrapper(httpRequest);

        // 记录请求体（仅对有请求体的方法）
        String method = httpRequest.getMethod().toUpperCase();
        if (("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) 
                && wrappedRequest.getBodyLength() > 0) {
            String requestBody = wrappedRequest.getBody();
            // 限制日志长度
            String logBody = requestBody.length() > 2000
                    ? requestBody.substring(0, 2000) + "... (truncated, total: " + requestBody.length() + " chars)"
                    : requestBody;
            log.info("   请求参数: {}", logBody);
        }

        // 记录请求头
        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = httpRequest.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            String value = httpRequest.getHeader(name);
            headers.put(name, value);
        }
        if (!headers.isEmpty()) {
            try {
                log.info("   请求头: {}", objectMapper.writeValueAsString(headers));
            } catch (Exception e) {
                log.info("   请求头: {}", headers);
            }
        }

        // 包装响应以便记录内容
        ResponseWrapper wrappedResponse = new ResponseWrapper(httpResponse);

        try {
            chain.doFilter(wrappedRequest, wrappedResponse);
        } catch (Exception ex) {
            log.error("❌ [{}] 请求处理异常: {}", requestId, ex.getMessage(), ex);
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            log.info("   状态码: {}", wrappedResponse.getStatus());
            log.info("   处理时间: {} ms", duration);

            // 记录响应内容
            String responseBody = wrappedResponse.getContentAsString();
            if (responseBody != null && !responseBody.isEmpty()) {
                // 限制日志长度，避免过长
                String logContent = responseBody.length() > 2000
                        ? responseBody.substring(0, 2000) + "... (truncated, total: " + responseBody.length() + " chars)"
                        : responseBody;
                log.info("   响应数据: {}", logContent);
            }

            log.info("📤 [{}] 请求结束", requestId);
            log.info("=".repeat(80));
        }
    }
}