package com.iflow.agent.service.office;

import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * 预览服务
 * 支持多种文件格式的预览生成
 */
@Service
@Slf4j
public class PreviewService {

    private static final String PREVIEW_DIR = "./storage/previews";
    
    // 支持的预览类型
    private static final Set<String> SUPPORTED_TYPES = Set.of(
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "txt", "md", "csv", "json", "xml",
        "jpg", "jpeg", "png", "gif", "bmp", "svg", "webp",
        "html", "htm", "diff", "patch"
    );

    /**
     * 获取文件预览
     */
    public Map<String, Object> getPreview(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String ext = getFileExtension(originalFilename);
        
        Map<String, Object> result = new HashMap<>();
        result.put("fileName", originalFilename);
        result.put("fileSize", file.getSize());
        result.put("fileType", ext);
        result.put("supported", SUPPORTED_TYPES.contains(ext.toLowerCase()));
        
        if (!SUPPORTED_TYPES.contains(ext.toLowerCase())) {
            result.put("message", "不支持的文件类型");
            return result;
        }
        
        // 生成预览内容
        switch (ext.toLowerCase()) {
            case "pdf" -> result.putAll(generatePdfPreview(file));
            case "jpg", "jpeg", "png", "gif", "bmp", "webp" -> 
                result.putAll(generateImagePreview(file));
            case "txt", "md", "json", "xml", "csv", "diff", "patch" -> 
                result.putAll(generateTextPreview(file));
            case "html", "htm" -> result.putAll(generateHtmlPreview(file));
            case "doc", "docx" -> result.putAll(generateWordPreview(file));
            case "xls", "xlsx" -> result.putAll(generateExcelPreview(file));
            default -> result.put("message", "预览功能开发中");
        }
        
        return result;
    }

    /**
     * 获取支持的预览类型列表
     */
    public List<Map<String, String>> getSupportedTypes() {
        List<Map<String, String>> types = new ArrayList<>();
        
        types.add(createTypeInfo("pdf", "PDF 文档"));
        types.add(createTypeInfo("doc, docx", "Word 文档"));
        types.add(createTypeInfo("xls, xlsx", "Excel 表格"));
        types.add(createTypeInfo("ppt, pptx", "PowerPoint 演示文稿"));
        types.add(createTypeInfo("txt, md", "文本文件"));
        types.add(createTypeInfo("jpg, jpeg, png, gif, bmp, webp", "图片文件"));
        types.add(createTypeInfo("html, htm", "HTML 文件"));
        types.add(createTypeInfo("json, xml, csv", "数据文件"));
        types.add(createTypeInfo("diff, patch", "差异文件"));
        
        return types;
    }

    // ===== 预览生成方法 =====

    /**
     * 生成 PDF 预览
     */
    private Map<String, Object> generatePdfPreview(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFRenderer renderer = new PDFRenderer(document);
            
            // 生成第一页的缩略图
            BufferedImage image = renderer.renderImageWithDPI(0, 150);
            
            Path previewPath = Paths.get(PREVIEW_DIR);
            if (!Files.exists(previewPath)) {
                Files.createDirectories(previewPath);
            }
            
            String thumbnailName = "pdf_" + System.currentTimeMillis() + ".jpg";
            Path thumbnailPath = previewPath.resolve(thumbnailName);
            
            ImageIO.write(image, "jpg", thumbnailPath.toFile());
            
            result.put("thumbnailUrl", "/api/previews/" + thumbnailName);
            result.put("pageCount", document.getNumberOfPages());
            result.put("content", "PDF 文档 - " + document.getNumberOfPages() + " 页");
        }
        
        return result;
    }

    /**
     * 生成图片预览
     */
    private Map<String, Object> generateImagePreview(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        Path previewPath = Paths.get(PREVIEW_DIR);
        if (!Files.exists(previewPath)) {
            Files.createDirectories(previewPath);
        }
        
        // 生成缩略图
        String thumbnailName = "img_" + System.currentTimeMillis() + ".jpg";
        Path thumbnailPath = previewPath.resolve(thumbnailName);
        
        Thumbnails.of(file.getInputStream())
            .size(400, 300)
            .toFile(thumbnailPath.toFile());
        
        result.put("thumbnailUrl", "/api/previews/" + thumbnailName);
        result.put("content", "图片预览");
        
        // 获取图片信息
        BufferedImage original = ImageIO.read(file.getInputStream());
        result.put("width", original.getWidth());
        result.put("height", original.getHeight());
        
        return result;
    }

    /**
     * 生成文本预览
     */
    private Map<String, Object> generateTextPreview(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        String content = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
        
        // 限制预览长度
        int maxLength = 5000;
        if (content.length() > maxLength) {
            result.put("content", content.substring(0, maxLength) + "\n\n... (内容过长，仅显示前 " + maxLength + " 字符)");
            result.put("truncated", true);
        } else {
            result.put("content", content);
            result.put("truncated", false);
        }
        
        result.put("lineCount", content.split("\n").length);
        result.put("charCount", content.length());
        
        return result;
    }

    /**
     * 生成 HTML 预览
     */
    private Map<String, Object> generateHtmlPreview(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        String content = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
        
        // 提取纯文本内容（简单实现）
        String textContent = content.replaceAll("<[^>]*>", "");
        
        int maxLength = 3000;
        if (textContent.length() > maxLength) {
            result.put("content", textContent.substring(0, maxLength) + "...");
        } else {
            result.put("content", textContent);
        }
        
        result.put("htmlContent", content);
        result.put("isHtml", true);
        
        return result;
    }

    /**
     * 生成 Word 预览
     */
    private Map<String, Object> generateWordPreview(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        // 简单实现：读取为文本
        // 完整实现需要使用 Apache POI
        
        String content = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
        
        // 尝试提取文本内容（简化版）
        String textContent = content.replaceAll("<[^>]*>", " ");
        textContent = textContent.replaceAll("\\s+", " ").trim();
        
        int maxLength = 3000;
        if (textContent.length() > maxLength) {
            result.put("content", textContent.substring(0, maxLength) + "...");
        } else {
            result.put("content", textContent);
        }
        
        result.put("fileType", "Word 文档");
        result.put("message", "Word 文档预览（简化版）");
        
        return result;
    }

    /**
     * 生成 Excel 预览
     */
    private Map<String, Object> generateExcelPreview(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        // 简单实现：显示基本信息
        // 完整实现需要使用 Apache POI
        
        result.put("content", "Excel 文件预览功能开发中...");
        result.put("fileType", "Excel 表格");
        result.put("fileSize", file.getSize());
        
        return result;
    }

    // ===== 辅助方法 =====

    private Map<String, String> createTypeInfo(String extensions, String description) {
        Map<String, String> info = new HashMap<>();
        info.put("extensions", extensions);
        info.put("description", description);
        return info;
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : "";
    }
}
