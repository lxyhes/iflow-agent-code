package com.iflow.agent.dto.file;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 文件树节点 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileTreeNode {
    private String name;
    private String path;
    private String type; // "directory" or "file"
    private Long size;
    private Long modified;
    private String permissionsRwx;
    private List<FileTreeNode> children;
}
