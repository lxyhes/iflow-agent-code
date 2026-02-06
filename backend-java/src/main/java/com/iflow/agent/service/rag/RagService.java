package com.iflow.agent.service.rag;

import com.iflow.agent.dto.rag.RagResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * RAG 服务 - 对应 Python 的 RAGService
 * 简化实现，使用 TF-IDF 风格的简单检索
 */
@Slf4j
@Service
public class RagService {

    // 项目索引缓存
    private final Map<String, ProjectIndex> indexCache = new ConcurrentHashMap<>();

    // 支持的文件扩展名
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(
            ".txt", ".md", ".java", ".py", ".js", ".ts", ".html", ".css",
            ".json", ".xml", ".yaml", ".yml", ".sql", ".sh", ".bat",
            ".c", ".cpp", ".h", ".hpp", ".go", ".rs", ".rb", ".php"
    );

    // 忽略的文件和目录
    private static final Set<String> IGNORED_PATTERNS = Set.of(
            ".git", ".svn", ".hg", "node_modules", "vendor", "target",
            "build", "dist", ".idea", ".vscode", "__pycache__", ".DS_Store"
    );

    /**
     * 获取 RAG 统计信息
     */
    public Map<String, Object> getStats(String projectPath) {
        ProjectIndex index = indexCache.get(projectPath);

        if (index == null) {
            return Map.of(
                    "indexed", false,
                    "document_count", 0,
                    "chunk_count", 0,
                    "last_indexed", null
            );
        }

        return Map.of(
                "indexed", true,
                "document_count", index.getDocumentCount(),
                "chunk_count", index.getChunkCount(),
                "last_indexed", index.getLastIndexed()
        );
    }

    /**
     * 索引项目
     */
    public List<Map<String, Object>> indexProject(String projectPath, boolean forceReindex) {
        log.info("Indexing project: {}, force={}", projectPath, forceReindex);

        List<Map<String, Object>> progress = new ArrayList<>();

        // 检查是否已索引
        if (!forceReindex && indexCache.containsKey(projectPath)) {
            progress.add(Map.of(
                    "type", "info",
                    "message", "项目已索引，使用缓存"
            ));
            return progress;
        }

        try {
            Path root = Paths.get(projectPath);
            if (!Files.exists(root)) {
                progress.add(Map.of(
                        "type", "error",
                        "message", "项目路径不存在: " + projectPath
                ));
                return progress;
            }

            // 收集文件
            List<Path> files = collectFiles(root);
            progress.add(Map.of(
                    "type", "progress",
                    "message", "发现 " + files.size() + " 个文件",
                    "total_files", files.size()
            ));

            // 创建索引
            ProjectIndex index = new ProjectIndex(projectPath);
            int processed = 0;

            for (Path file : files) {
                try {
                    List<DocumentChunk> chunks = processFile(file, root);
                    index.addDocument(file.toString(), chunks);
                    processed++;

                    if (processed % 10 == 0) {
                        progress.add(Map.of(
                                "type", "progress",
                                "message", "已处理 " + processed + "/" + files.size() + " 个文件",
                                "processed", processed,
                                "total", files.size()
                        ));
                    }
                } catch (Exception e) {
                    log.warn("Failed to process file: {}", file, e);
                }
            }

            index.setLastIndexed(new Date());
            indexCache.put(projectPath, index);

            progress.add(Map.of(
                    "type", "complete",
                    "message", "索引完成",
                    "document_count", index.getDocumentCount(),
                    "chunk_count", index.getChunkCount()
            ));

        } catch (Exception e) {
            log.error("Failed to index project: {}", projectPath, e);
            progress.add(Map.of(
                    "type", "error",
                    "message", "索引失败: " + e.getMessage()
            ));
        }

        return progress;
    }

    /**
     * 检索文档
     */
    public List<RagResult> retrieve(String projectPath, String query, int nResults,
                                     double similarityThreshold, List<String> fileTypes,
                                     List<String> languages, int minChunkSize, int maxChunkSize,
                                     String sortBy) {
        log.info("RAG检索: project={}, query={}", projectPath, query);

        ProjectIndex index = indexCache.get(projectPath);
        if (index == null) {
            log.warn("Project not indexed: {}", projectPath);
            return List.of();
        }

        // 简单的关键词匹配
        List<String> queryTerms = tokenize(query.toLowerCase());

        List<RagResult> results = new ArrayList<>();

        for (Map.Entry<String, List<DocumentChunk>> entry : index.getDocuments().entrySet()) {
            String filePath = entry.getKey();

            // 文件类型过滤
            if (fileTypes != null && !fileTypes.isEmpty()) {
                String ext = getFileExtension(filePath);
                if (!fileTypes.contains(ext)) {
                    continue;
                }
            }

            for (DocumentChunk chunk : entry.getValue()) {
                // 块大小过滤
                if (chunk.getContent().length() < minChunkSize ||
                        chunk.getContent().length() > maxChunkSize) {
                    continue;
                }

                // 计算相似度
                double similarity = calculateSimilarity(queryTerms, chunk);

                if (similarity >= similarityThreshold) {
                    results.add(RagResult.builder()
                            .id(chunk.getId())
                            .content(chunk.getContent())
                            .similarity(similarity)
                            .metadata(Map.of(
                                    "file_path", filePath,
                                    "chunk_index", chunk.getIndex(),
                                    "language", detectLanguage(filePath)
                            ))
                            .build());
                }
            }
        }

        // 排序
        switch (sortBy) {
            case "similarity" -> results.sort((a, b) -> Double.compare(b.getSimilarity(), a.getSimilarity()));
            case "size" -> results.sort((a, b) -> Integer.compare(b.getContent().length(), a.getContent().length()));
            default -> results.sort((a, b) -> Double.compare(b.getSimilarity(), a.getSimilarity()));
        }

        // 限制结果数量
        return results.stream()
                .limit(nResults)
                .collect(Collectors.toList());
    }

    /**
     * 重置索引
     */
    public void resetIndex(String projectPath) {
        log.info("Resetting RAG index: {}", projectPath);
        indexCache.remove(projectPath);
    }

    /**
     * 清除 RAG 缓存
     */
    public void clearCache() {
        log.info("Clearing RAG cache");
        indexCache.clear();
    }

    /**
     * 添加文档到 RAG 知识库
     */
    public Map<String, Object> addDocument(String projectPath, String fileName, String content, String fileType) {
        log.info("Adding document to RAG: project={}, file={}", projectPath, fileName);

        ProjectIndex index = indexCache.computeIfAbsent(projectPath, ProjectIndex::new);

        // 简单的分块策略
        List<DocumentChunk> chunks = new ArrayList<>();
        int chunkSize = 1000;
        int overlap = 200;

        for (int i = 0; i < content.length(); i += chunkSize - overlap) {
            int end = Math.min(i + chunkSize, content.length());
            String chunkContent = content.substring(i, end);

            chunks.add(new DocumentChunk(
                    UUID.randomUUID().toString(),
                    fileName + "_" + chunks.size(),
                    chunkContent,
                    chunks.size()
            ));

            if (end == content.length()) {
                break;
            }
        }

        index.addDocument(fileName, chunks);
        index.setLastIndexed(new Date());

        return Map.of(
                "success", true,
                "message", "文档已添加到RAG知识库",
                "file_name", fileName,
                "file_type", fileType,
                "chunks_added", chunks.size()
        );
    }

    // ========== 私有方法 ==========

    private List<Path> collectFiles(Path root) throws IOException {
        List<Path> files = new ArrayList<>();

        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(Files::isRegularFile)
                    .filter(this::isSupportedFile)
                    .forEach(files::add);
        }

        return files;
    }

    private boolean isSupportedFile(Path path) {
        String fileName = path.getFileName().toString();

        // 检查忽略模式
        for (String ignored : IGNORED_PATTERNS) {
            if (fileName.contains(ignored)) {
                return false;
            }
        }

        // 检查扩展名
        String ext = getFileExtension(fileName);
        return SUPPORTED_EXTENSIONS.contains(ext);
    }

    private String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot).toLowerCase() : "";
    }

    private List<DocumentChunk> processFile(Path file, Path root) throws IOException {
        String content = Files.readString(file);
        String relativePath = root.relativize(file).toString();

        // 简单的分块策略
        List<DocumentChunk> chunks = new ArrayList<>();
        int chunkSize = 1000;
        int overlap = 200;

        for (int i = 0; i < content.length(); i += chunkSize - overlap) {
            int end = Math.min(i + chunkSize, content.length());
            String chunkContent = content.substring(i, end);

            chunks.add(new DocumentChunk(
                    UUID.randomUUID().toString(),
                    relativePath + "_" + chunks.size(),
                    chunkContent,
                    chunks.size()
            ));

            if (end == content.length()) {
                break;
            }
        }

        return chunks;
    }

    private List<String> tokenize(String text) {
        // 简单的分词
        return Arrays.stream(text.split("\\s+"))
                .filter(s -> s.length() > 2)
                .collect(Collectors.toList());
    }

    private double calculateSimilarity(List<String> queryTerms, DocumentChunk chunk) {
        String chunkLower = chunk.getContent().toLowerCase();
        List<String> chunkTerms = tokenize(chunkLower);

        if (chunkTerms.isEmpty()) {
            return 0.0;
        }

        // 计算交集
        long matches = queryTerms.stream()
                .filter(chunkLower::contains)
                .count();

        // 简单的 Jaccard 相似度
        return (double) matches / (queryTerms.size() + chunkTerms.size() - matches);
    }

    private String detectLanguage(String filePath) {
        String ext = getFileExtension(filePath);
        return switch (ext) {
            case ".java" -> "java";
            case ".py" -> "python";
            case ".js" -> "javascript";
            case ".ts" -> "typescript";
            case ".html" -> "html";
            case ".css" -> "css";
            case ".go" -> "go";
            case ".rs" -> "rust";
            case ".c", ".cpp", ".h", ".hpp" -> "cpp";
            default -> "text";
        };
    }

    // ========== 内部类 ==========

    private static class ProjectIndex {
        private final String projectPath;
        private final Map<String, List<DocumentChunk>> documents = new ConcurrentHashMap<>();
        private Date lastIndexed;

        public ProjectIndex(String projectPath) {
            this.projectPath = projectPath;
        }

        public void addDocument(String filePath, List<DocumentChunk> chunks) {
            documents.put(filePath, chunks);
        }

        public int getDocumentCount() {
            return documents.size();
        }

        public int getChunkCount() {
            return documents.values().stream()
                    .mapToInt(List::size)
                    .sum();
        }

        public Map<String, List<DocumentChunk>> getDocuments() {
            return documents;
        }

        public Date getLastIndexed() {
            return lastIndexed;
        }

        public void setLastIndexed(Date lastIndexed) {
            this.lastIndexed = lastIndexed;
        }
    }

    private static class DocumentChunk {
        private final String id;
        private final String source;
        private final String content;
        private final int index;

        public DocumentChunk(String id, String source, String content, int index) {
            this.id = id;
            this.source = source;
            this.content = content;
            this.index = index;
        }

        public String getId() {
            return id;
        }

        public String getSource() {
            return source;
        }

        public String getContent() {
            return content;
        }

        public int getIndex() {
            return index;
        }
    }
}
