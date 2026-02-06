package com.iflow.agent.config;

import com.iflow.agent.AgentApplication;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

/**
 * 重启管理器
 * 用于在需要时重启应用（如切换 SDK 模式下的模型）
 */
@Slf4j
@Component
public class RestartManager {

    @Autowired
    private ConfigurableApplicationContext context;

    /**
     * 重启应用
     * 用于 SDK 模式下切换模型后的配置更新
     */
    public void restart() {
        log.info("Initiating application restart...");
        
        try {
            // 关闭当前应用上下文
            context.close();
            
            // 创建新线程来重启，避免阻塞当前线程
            Thread restartThread = new Thread(() -> {
                try {
                    log.info("Starting new application context...");
                    
                    // 获取主类
                    String mainClass = AgentApplication.class.getName();
                    
                    // 使用反射调用 main 方法重启应用
                    Class<?> clazz = Class.forName(mainClass);
                    java.lang.reflect.Method mainMethod = clazz.getMethod("main", String[].class);
                    mainMethod.invoke(null, (Object) new String[0]);
                    
                    log.info("Application restarted successfully");
                } catch (Exception e) {
                    log.error("Failed to restart application", e);
                    System.exit(1);
                }
            });
            
            restartThread.setDaemon(false);
            restartThread.start();
            
        } catch (Exception e) {
            log.error("Error during restart", e);
        }
    }
    
    /**
     * 检查是否支持重启
     */
    public boolean isRestartSupported() {
        return true;
    }
}