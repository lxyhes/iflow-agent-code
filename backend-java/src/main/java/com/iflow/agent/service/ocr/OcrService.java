package com.iflow.agent.service.ocr;

import com.iflow.agent.dto.ocr.OcrRequest;
import com.iflow.agent.dto.ocr.OcrResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OCR 服务 - 对应 Python 的 OCR 功能
 * 简化实现，使用模拟数据
 */
@Slf4j
@Service
public class OcrService {

    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    private static final int PREVIEW_TTL_SECONDS = 600;

    // 预览缓存
    private final Map<String, PreviewEntry> previewCache = new ConcurrentHashMap<>();

    /**
     * OCR 识别
     */
    public OcrResponse recognize(MultipartFile file, OcrRequest request, String projectName) {
        log.info("OCR识别: file={}, technology={}", file.getOriginalFilename(), request.getTechnology());

        // 验证文件
        if (file.isEmpty()) {
            throw new IllegalArgumentException("空文件");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("文件过大");
        }

        try {
            String filename = file.getOriginalFilename();
            byte[] content = file.getBytes();

            // 清理过期缓存
            purgePreviewCache();

            // 判断文件类型
            boolean isPdf = filename != null && filename.toLowerCase().endsWith(".pdf");

            if (isPdf) {
                return processPdf(content, request, projectName);
            } else {
                return processImage(content, request, projectName);
            }

        } catch (IOException e) {
            log.error("OCR识别失败", e);
            throw new RuntimeException("OCR识别失败: " + e.getMessage());
        }
    }

    /**
     * 获取预览图片
     */
    public byte[] getPreview(String token, int page, int maxSide) {
        PreviewEntry entry = previewCache.get(token);
        if (entry == null || entry.isExpired()) {
            throw new IllegalArgumentException("预览已过期或不存在");
        }

        // 简化实现，返回模拟图片数据
        // 实际应该使用图像处理库生成预览
        return generateMockImage(maxSide);
    }

    /**
     * 清除缓存
     */
    public int clearCache() {
        int count = previewCache.size();
        previewCache.clear();
        return count;
    }

    // ========== 私有方法 ==========

    private OcrResponse processPdf(byte[] content, OcrRequest request, String projectName) {
        log.info("处理PDF文件");

        String previewToken = null;
        if (request.getReturnImages()) {
            previewToken = generateToken();
            previewCache.put(previewToken, new PreviewEntry("application/pdf", content));
        }

        // 模拟多页PDF处理
        int totalPages = 3; // 假设3页
        List<Map<String, Object>> pages = new ArrayList<>();
        StringBuilder fullText = new StringBuilder();

        for (int i = 0; i < totalPages; i++) {
            String pageText = mockOcrText();
            fullText.append(pageText).append("\n\n");

            Map<String, Object> pageResult = new HashMap<>();
            pageResult.put("page", i + 1);
            pageResult.put("success", true);
            pageResult.put("text", pageText);
            pageResult.put("blocks", mockBlocks());
            pageResult.put("width", 800);
            pageResult.put("height", 1100);

            if (request.getReturnImages() && previewToken != null && i < request.getMaxPreviewPages()) {
                pageResult.put("preview_url", "/api/projects/" + projectName + "/ocr/preview?token=" + previewToken + "&page=" + (i + 1) + "&max_side=" + request.getPreviewMaxSide());
            }

            pages.add(pageResult);
        }

        return OcrResponse.builder()
                .success(true)
                .technology(request.getTechnology())
                .totalPages(totalPages)
                .text(fullText.toString().trim())
                .pages(pages)
                .previewToken(previewToken)
                .build();
    }

    private OcrResponse processImage(byte[] content, OcrRequest request, String projectName) {
        log.info("处理图片文件");

        String previewToken = null;
        String previewUrl = null;

        if (request.getReturnImages()) {
            previewToken = generateToken();
            previewCache.put(previewToken, new PreviewEntry("image", content));
            previewUrl = "/api/projects/" + projectName + "/ocr/preview?token=" + previewToken + "&page=1&max_side=" + request.getPreviewMaxSide();
        }

        String text = mockOcrText();

        return OcrResponse.builder()
                .success(true)
                .technology(request.getTechnology())
                .page(1)
                .width(800)
                .height(600)
                .processedWidth(800)
                .processedHeight(600)
                .text(text)
                .blocks(mockBlocks())
                .previewUrl(previewUrl)
                .previewToken(previewToken)
                .build();
    }

    private void purgePreviewCache() {
        long now = System.currentTimeMillis();
        previewCache.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private String mockOcrText() {
        return "这是OCR识别的示例文本。\n\n" +
                "姓名：张三\n" +
                "电话：138-0000-0000\n" +
                "邮箱：zhangsan@example.com\n\n" +
                "工作经历：\n" +
                "2020-2024 高级Java开发工程师\n" +
                "2018-2020 Java开发工程师\n\n" +
                "技能：Java, Spring Boot, MySQL, Redis";
    }

    private List<Map<String, Object>> mockBlocks() {
        List<Map<String, Object>> blocks = new ArrayList<>();

        blocks.add(Map.of(
                "text", "姓名：张三",
                "confidence", 0.95,
                "box", List.of(100, 100, 300, 100, 300, 130, 100, 130)
        ));

        blocks.add(Map.of(
                "text", "电话：138-0000-0000",
                "confidence", 0.92,
                "box", List.of(100, 150, 350, 150, 350, 180, 100, 180)
        ));

        blocks.add(Map.of(
                "text", "Java开发工程师",
                "confidence", 0.88,
                "box", List.of(100, 200, 280, 200, 280, 230, 100, 230)
        ));

        return blocks;
    }

    private byte[] generateMockImage(int maxSide) {
        // 简化实现，返回空字节数组
        // 实际应该生成真实的图片数据
        return new byte[0];
    }

    // ========== 内部类 ==========

    private static class PreviewEntry {
        private final String mimeType;
        private final byte[] content;
        private final long createdAt;

        public PreviewEntry(String mimeType, byte[] content) {
            this.mimeType = mimeType;
            this.content = content;
            this.createdAt = System.currentTimeMillis();
        }

        public boolean isExpired() {
            return isExpired(System.currentTimeMillis());
        }

        public boolean isExpired(long now) {
            return (now - createdAt) > PREVIEW_TTL_SECONDS * 1000;
        }
    }
}
