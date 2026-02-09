package com.iflow.agent.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

/**
 * API 请求日志拦截器
 * 记录所有请求的接口、参数和返回数据
 */
@Slf4j
@Component
public class LoggingConfig implements HandlerInterceptor {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestId = java.util.UUID.randomUUID().toString().substring(0, 8);

        log.info("=".repeat(80));
        log.info("📥 [{}] 请求开始", requestId);
        log.info("   方法: {}", request.getMethod());
        log.info("   路径: {}", request.getRequestURI());
        log.info("   完整URL: {}", request.getRequestURL());

        // 记录查询参数
        Map<String, String> queryParams = new HashMap<>();
        Enumeration<String> paramNames = request.getParameterNames();
        while (paramNames.hasMoreElements()) {
            String name = paramNames.nextElement();
            String value = request.getParameter(name);
            queryParams.put(name, value);
        }
        if (!queryParams.isEmpty()) {
            log.info("   查询参数: {}", objectMapper.writeValueAsString(queryParams));
        }

        // 记录请求头
        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            String value = request.getHeader(name);
            headers.put(name, value);
        }
        if (!headers.isEmpty()) {
            log.info("   请求头: {}", objectMapper.writeValueAsString(headers));
        }

        // 将请求 ID 存入请求属性，以便在 afterHandle 中使用
        request.setAttribute("requestId", requestId);
        request.setAttribute("startTime", System.currentTimeMillis());

        // 包装响应以便记录内容
        if (response instanceof ResponseWrapper) {
            // 已经包装过，跳过
        } else {
            ResponseWrapper wrappedResponse = new ResponseWrapper(response);
            request.setAttribute("wrappedResponse", wrappedResponse);
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        String requestId = (String) request.getAttribute("requestId");
        Long startTime = (Long) request.getAttribute("startTime");

        if (requestId != null && startTime != null) {
            long duration = System.currentTimeMillis() - startTime;

            log.info("   状态码: {}", response.getStatus());
            log.info("   处理时间: {} ms", duration);

            // 尝试记录响应内容
            ResponseWrapper wrappedResponse = (ResponseWrapper) request.getAttribute("wrappedResponse");
            if (wrappedResponse != null) {
                String responseBody = wrappedResponse.getContentAsString();
                if (responseBody != null && !responseBody.isEmpty()) {
                    // 限制日志长度，避免过长
                    String logContent = responseBody.length() > 1000
                            ? responseBody.substring(0, 1000) + "... (truncated)"
                            : responseBody;
                    log.info("   响应数据: {}", logContent);
                }
            }

            log.info("📤 [{}] 请求结束", requestId);
            log.info("=".repeat(80));

            if (ex != null) {
                log.error("❌ [{}] 异常: {}", requestId, ex.getMessage(), ex);
            }
        }
    }
}