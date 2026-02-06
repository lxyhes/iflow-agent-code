package com.iflow.agent.service.file;

import com.iflow.agent.config.CacheConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
public class FileService {

    private final CacheConfig cacheConfig;

    @Autowired
    public FileService(CacheConfig cacheConfig) {
        this.cacheConfig = cacheConfig;
    }

    public List<FileNode> getTree(String rootPath) throws IOException {
        Path path = Paths.get(rootPath);
        if (!Files.exists(path)) {
            return Collections.emptyList();
        }

        return listFiles(path, path);
    }

    private List<FileNode> listFiles(Path currentPath, Path rootPath) throws IOException {
        List<FileNode> result = new ArrayList<>();

        if (!Files.isDirectory(currentPath)) {
            return result;
        }

        try (Stream<Path> stream = Files.list(currentPath)) {
            List<Path> paths = stream
                    .filter(p -> !p.getFileName().toString().startsWith("."))
                    .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                    .collect(Collectors.toList());

            for (Path p : paths) {
                FileNode node = new FileNode();
                node.setName(p.getFileName().toString());
                node.setPath(rootPath.relativize(p).toString().replace("\\", "/"));
                node.setType(Files.isDirectory(p) ? "directory" : "file");

                if (Files.isDirectory(p)) {
                    node.setChildren(listFiles(p, rootPath));
                }

                result.add(node);
            }
        }

        return result;
    }

    public String readFile(String rootPath, String filePath) throws IOException {
        Path fullPath = resolvePath(rootPath, filePath);

        if (!Files.exists(fullPath)) {
            throw new NoSuchFileException("File not found: " + filePath);
        }

        if (!Files.isRegularFile(fullPath)) {
            throw new IOException("Not a file: " + filePath);
        }

        return Files.readString(fullPath, StandardCharsets.UTF_8);
    }

    public void writeFile(String rootPath, String filePath, String content) throws IOException {
        Path fullPath = resolvePath(rootPath, filePath);

        // Ensure parent directory exists
        Path parent = fullPath.getParent();
        if (parent != null && !Files.exists(parent)) {
            Files.createDirectories(parent);
        }

        Files.writeString(fullPath, content, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        log.info("File saved: {} ({} bytes)", filePath, content.getBytes(StandardCharsets.UTF_8).length);
    }

    public void deleteFile(String rootPath, String filePath) throws IOException {
        Path fullPath = resolvePath(rootPath, filePath);
        Files.deleteIfExists(fullPath);
        log.info("File deleted: {}", filePath);
    }

    public boolean exists(String rootPath, String filePath) {
        try {
            Path fullPath = resolvePath(rootPath, filePath);
            return Files.exists(fullPath);
        } catch (Exception e) {
            return false;
        }
    }

    public void createDirectory(String rootPath, String dirPath) throws IOException {
        Path fullPath = resolvePath(rootPath, dirPath);
        Files.createDirectories(fullPath);
        log.info("Directory created: {}", dirPath);
    }

    private Path resolvePath(String rootPath, String filePath) {
        Path root = Paths.get(rootPath).toAbsolutePath().normalize();
        Path relative = Paths.get(filePath).normalize();

        // Prevent path traversal
        if (relative.toString().contains("..")) {
            throw new SecurityException("Path traversal detected: " + filePath);
        }

        Path fullPath = root.resolve(relative).normalize();

        // Double-check the resolved path is within root
        if (!fullPath.startsWith(root)) {
            throw new SecurityException("Access denied: path outside project directory");
        }

        return fullPath;
    }

    public static class FileNode {
        private String name;
        private String path;
        private String type;
        private List<FileNode> children;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public List<FileNode> getChildren() {
            return children;
        }

        public void setChildren(List<FileNode> children) {
            this.children = children;
        }
    }
}
