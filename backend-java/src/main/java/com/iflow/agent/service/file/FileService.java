package com.iflow.agent.service.file;

import com.iflow.agent.dto.file.FileTreeNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.MalformedInputException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.*;
import java.util.stream.Stream;

/**
 * 文件服务 - 对应 Python 的 FileService
 */
@Slf4j
@Service
public class FileService {

    @Value("${file.max-size:104857600}") // 100MB default
    private long maxFileSize;

    // 默认忽略的文件模式
    private static final List<String> DEFAULT_IGNORE_PATTERNS = List.of(
            ".git", "__pycache__", "node_modules", "*.pyc", ".DS_Store",
            ".idea", ".vscode", "target", "build", "dist", "*.class"
    );

    /**
     * 获取项目文件树
     */
    public List<FileTreeNode> getTree(String rootPath) {
        Path root = Paths.get(rootPath);
        if (!Files.exists(root)) {
            return List.of();
        }

        return buildTree(root, root, DEFAULT_IGNORE_PATTERNS);
    }

    /**
     * 读取文件内容
     */
    public String readFile(String rootPath, String relPath) throws IOException {
        // 安全检查：防止路径遍历
        if (containsPathTraversal(relPath)) {
            throw new SecurityException("Access denied: path traversal detected");
        }

        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        Path filePath = root.resolve(relPath).toAbsolutePath().normalize();

        // 确保文件在项目目录内
        if (!filePath.startsWith(root)) {
            throw new SecurityException("Access denied: path outside project directory");
        }

        if (!Files.exists(filePath)) {
            throw new NoSuchFileException("File not found: " + relPath);
        }

        if (!Files.isRegularFile(filePath)) {
            throw new IOException("Not a file: " + relPath);
        }

        // 检查文件大小
        long size = Files.size(filePath);
        if (size > maxFileSize) {
            throw new IOException(String.format(
                    "文件过大（%.1f MB），超过最大限制（%.1f MB）",
                    size / (1024.0 * 1024.0),
                    maxFileSize / (1024.0 * 1024.0)
            ));
        }

        try {
            return Files.readString(filePath, StandardCharsets.UTF_8);
        } catch (MalformedInputException e) {
            return "[Binary Content - Cannot display]";
        }
    }

    /**
     * 获取文件资源（用于下载）
     */
    public Resource getFileResource(String rootPath, String relPath) throws IOException {
        // 安全检查
        if (containsPathTraversal(relPath)) {
            throw new SecurityException("Access denied: path traversal detected");
        }

        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        Path filePath = root.resolve(relPath).toAbsolutePath().normalize();

        if (!filePath.startsWith(root)) {
            throw new SecurityException("Access denied: path outside project directory");
        }

        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            throw new NoSuchFileException("File not found: " + relPath);
        }

        long size = Files.size(filePath);
        if (size > maxFileSize) {
            throw new IOException(String.format(
                    "文件过大（%.1f MB），超过最大限制（%.1f MB）",
                    size / (1024.0 * 1024.0),
                    maxFileSize / (1024.0 * 1024.0)
            ));
        }

        return new FileSystemResource(filePath);
    }

    /**
     * 写入文件
     */
    public void writeFile(String rootPath, String relPath, String content) throws IOException {
        // 安全检查
        if (containsPathTraversal(relPath)) {
            throw new SecurityException("Access denied: path traversal detected");
        }

        // 检查内容大小
        int contentSize = content.getBytes(StandardCharsets.UTF_8).length;
        if (contentSize > maxFileSize) {
            throw new IOException(String.format(
                    "文件内容过大（%.1f MB），超过最大限制（%.1f MB）",
                    contentSize / (1024.0 * 1024.0),
                    maxFileSize / (1024.0 * 1024.0)
            ));
        }

        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        Path filePath = root.resolve(relPath).toAbsolutePath().normalize();

        if (!filePath.startsWith(root)) {
            throw new SecurityException("Access denied: path outside project directory");
        }

        // 创建父目录
        Files.createDirectories(filePath.getParent());

        // 写入文件
        Files.writeString(filePath, content, StandardCharsets.UTF_8);

        log.info("文件保存成功: {} ({:.1f} KB)", relPath, contentSize / 1024.0);
    }

    /**
     * 删除文件
     */
    public void deleteFile(String rootPath, String relPath) throws IOException {
        if (containsPathTraversal(relPath)) {
            throw new SecurityException("Access denied: path traversal detected");
        }

        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        Path filePath = root.resolve(relPath).toAbsolutePath().normalize();

        if (!filePath.startsWith(root)) {
            throw new SecurityException("Access denied: path outside project directory");
        }

        Files.deleteIfExists(filePath);
        log.info("文件删除成功: {}", relPath);
    }

    /**
     * 创建目录
     */
    public void createDirectory(String rootPath, String relPath) throws IOException {
        if (containsPathTraversal(relPath)) {
            throw new SecurityException("Access denied: path traversal detected");
        }

        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        Path dirPath = root.resolve(relPath).toAbsolutePath().normalize();

        if (!dirPath.startsWith(root)) {
            throw new SecurityException("Access denied: path outside project directory");
        }

        Files.createDirectories(dirPath);
        log.info("目录创建成功: {}", relPath);
    }

    // ========== 私有方法 ==========

    private List<FileTreeNode> buildTree(Path currentPath, Path rootPath, List<String> ignorePatterns) {
        List<FileTreeNode> tree = new ArrayList<>();

        try (Stream<Path> stream = Files.list(currentPath)) {
            List<Path> entries = stream
                    .sorted(Comparator
                            .comparing((Path p) -> !Files.isDirectory(p))
                            .thenComparing(p -> p.getFileName().toString().toLowerCase()))
                    .toList();

            for (Path entry : entries) {
                String relPath = rootPath.relativize(entry).toString();

                // 检查是否应该忽略
                if (shouldIgnore(relPath, ignorePatterns)) {
                    continue;
                }

                BasicFileAttributes attrs = Files.readAttributes(entry, BasicFileAttributes.class);

                FileTreeNode node = FileTreeNode.builder()
                        .name(entry.getFileName().toString())
                        .path(relPath)
                        .type(Files.isDirectory(entry) ? "directory" : "file")
                        .size(attrs.size())
                        .modified(attrs.lastModifiedTime().toMillis())
                        .permissionsRwx(getPermissionsString(entry))
                        .build();

                if (Files.isDirectory(entry)) {
                    node.setChildren(buildTree(entry, rootPath, ignorePatterns));
                    tree.add(node);
                } else {
                    tree.add(node);
                }
            }
        } catch (IOException e) {
            log.error("Error scanning directory: {}", currentPath, e);
        }

        return tree;
    }

    private boolean shouldIgnore(String relPath, List<String> patterns) {
        String normalizedPath = relPath.replace('\\', '/');

        for (String pattern : patterns) {
            // 简单匹配逻辑
            if (pattern.contains("*")) {
                // 通配符匹配
                String prefix = pattern.substring(0, pattern.indexOf('*'));
                String suffix = pattern.substring(pattern.indexOf('*') + 1);
                if (normalizedPath.startsWith(prefix) && normalizedPath.endsWith(suffix)) {
                    return true;
                }
            } else {
                // 完全匹配或包含
                if (normalizedPath.equals(pattern) ||
                        normalizedPath.startsWith(pattern + "/") ||
                        normalizedPath.contains("/" + pattern + "/") ||
                        normalizedPath.endsWith("/" + pattern)) {
                    return true;
                }
            }
        }

        return false;
    }

    private boolean containsPathTraversal(String path) {
        String normalized = path.replace('\\', '/');
        return Arrays.asList(normalized.split("/")).contains("..");
    }

    private String getPermissionsString(Path path) {
        try {
            Set<PosixFilePermission> permissions = Files.getPosixFilePermissions(path);
            return PosixFilePermissions.toString(permissions);
        } catch (Exception e) {
            // Windows 或其他不支持 POSIX 的系统
            if (Files.isDirectory(path)) {
                return "rwxrwxrwx";
            } else if (Files.isReadable(path) && Files.isWritable(path)) {
                return "rw-rw-rw-";
            } else if (Files.isReadable(path)) {
                return "r--r--r--";
            } else {
                return "---------";
            }
        }
    }
}
