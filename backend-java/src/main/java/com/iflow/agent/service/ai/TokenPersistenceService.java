package com.iflow.agent.service.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Token 持久化服务
 * 将动态设置的 Token 保存到文件，重启后自动加载
 */
@Slf4j
@Service
public class TokenPersistenceService {

    @Value("${iflow.token.persistence.file:./cache/api_key.txt}")
    private String tokenFile;

    /**
     * 保存 Token 到文件
     */
    public void saveToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            log.warn("Attempted to save empty token");
            return;
        }

        try {
            Path path = Paths.get(tokenFile);
            Path parent = path.getParent();

            // 确保目录存在
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }

            // 写入 Token
            Files.writeString(path, token.trim());
            log.info("Token saved to file: {}", tokenFile);
        } catch (IOException e) {
            log.error("Failed to save token to file: {}", e.getMessage(), e);
        }
    }

    /**
     * 从文件加载 Token
     */
    public String loadToken() {
        try {
            Path path = Paths.get(tokenFile);

            if (!Files.exists(path)) {
                log.debug("Token file does not exist: {}", tokenFile);
                return null;
            }

            String token = Files.readString(path).trim();

            if (token.isEmpty()) {
                log.debug("Token file is empty: {}", tokenFile);
                return null;
            }

            log.info("Token loaded from file: {}", tokenFile);
            return token;
        } catch (IOException e) {
            log.error("Failed to load token from file: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * 删除 Token 文件
     */
    public void deleteToken() {
        try {
            Path path = Paths.get(tokenFile);

            if (Files.exists(path)) {
                Files.delete(path);
                log.info("Token file deleted: {}", tokenFile);
            }
        } catch (IOException e) {
            log.error("Failed to delete token file: {}", e.getMessage(), e);
        }
    }

    /**
     * 检查 Token 文件是否存在
     */
    public boolean hasToken() {
        try {
            Path path = Paths.get(tokenFile);
            return Files.exists(path) && Files.size(path) > 0;
        } catch (IOException e) {
            log.error("Failed to check token file: {}", e.getMessage(), e);
            return false;
        }
    }
}