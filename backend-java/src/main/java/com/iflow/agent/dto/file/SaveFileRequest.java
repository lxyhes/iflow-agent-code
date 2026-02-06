package com.iflow.agent.dto.file;

import lombok.Data;

/**
 * 保存文件请求 DTO
 */
@Data
public class SaveFileRequest {
    private String filePath;
    private String content;
}
