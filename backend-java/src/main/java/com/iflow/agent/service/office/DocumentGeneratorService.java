package com.iflow.agent.service.office;

import com.itextpdf.kernel.pdf.*;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;

/**
 * 文档生成服务
 * 支持生成 PDF、Word、PPT 等文档
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentGeneratorService {

    private static final String OUTPUT_DIR = "./storage/documents";

    /**
     * 生成 PDF 文档
     */
    public Map<String, Object> generatePdf(String content, String title, String template) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        // 确保输出目录存在
        Path outputDir = Paths.get(OUTPUT_DIR);
        if (!Files.exists(outputDir)) {
            Files.createDirectories(outputDir);
        }
        
        // 生成文件名
        String fileName = "document_" + System.currentTimeMillis() + ".pdf";
        Path outputPath = outputDir.resolve(fileName);
        
        try (PdfWriter writer = new PdfWriter(outputPath.toString());
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf, PageSize.A4)) {
            
            // 添加标题
            if (title != null && !title.isEmpty()) {
                Paragraph titleParagraph = new Paragraph(title)
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
                document.add(titleParagraph);
            }
            
            // 添加日期
            Paragraph datePara = new Paragraph("生成日期：" + LocalDate.now())
                .setFontSize(10)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginBottom(20);
            document.add(datePara);
            
            // 添加内容
            if (content != null) {
                // 解析 Markdown 风格的换行
                String[] lines = content.split("\n");
                for (String line : lines) {
                    if (line.trim().isEmpty()) {
                        document.add(new Paragraph("\n"));
                    } else if (line.startsWith("# ")) {
                        document.add(new Paragraph(line.substring(2))
                            .setFontSize(16)
                            .setBold()
                            .setMarginTop(15));
                    } else if (line.startsWith("## ")) {
                        document.add(new Paragraph(line.substring(3))
                            .setFontSize(14)
                            .setBold()
                            .setMarginTop(10));
                    } else if (line.startsWith("- ") || line.startsWith("* ")) {
                        document.add(new Paragraph("• " + line.substring(2)));
                    } else {
                        document.add(new Paragraph(line)
                            .setFontSize(11)
                            .setTextAlignment(TextAlignment.JUSTIFIED));
                    }
                }
            }
        }
        
        result.put("fileName", fileName);
        result.put("filePath", outputPath.toString());
        result.put("fileSize", Files.size(outputPath));
        result.put("downloadUrl", "/api/documents/download/" + fileName);
        
        return result;
    }

    /**
     * 生成 Word 文档
     */
    public Map<String, Object> generateWord(String content, String title) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        Path outputDir = Paths.get(OUTPUT_DIR);
        if (!Files.exists(outputDir)) {
            Files.createDirectories(outputDir);
        }
        
        String fileName = "document_" + System.currentTimeMillis() + ".docx";
        Path outputPath = outputDir.resolve(fileName);
        
        try (XWPFDocument document = new XWPFDocument()) {
            // 添加标题
            if (title != null && !title.isEmpty()) {
                XWPFParagraph titlePara = document.createParagraph();
                titlePara.setAlignment(ParagraphAlignment.CENTER);
                XWPFRun titleRun = titlePara.createRun();
                titleRun.setText(title);
                titleRun.setBold(true);
                titleRun.setFontSize(18);
            }
            
            // 添加日期
            XWPFParagraph datePara = document.createParagraph();
            datePara.setAlignment(ParagraphAlignment.RIGHT);
            XWPFRun dateRun = datePara.createRun();
            dateRun.setText("生成日期：" + LocalDate.now());
            dateRun.setFontSize(10);
            
            // 添加内容
            if (content != null) {
                String[] lines = content.split("\n");
                for (String line : lines) {
                    if (line.trim().isEmpty()) {
                        document.createParagraph();
                    } else {
                        XWPFParagraph para = document.createParagraph();
                        XWPFRun run = para.createRun();
                        run.setText(line);
                        
                        if (line.startsWith("# ")) {
                            run.setBold(true);
                            run.setFontSize(16);
                        } else if (line.startsWith("## ")) {
                            run.setBold(true);
                            run.setFontSize(14);
                        }
                    }
                }
            }
            
            // 写入文件
            try (FileOutputStream fos = new FileOutputStream(outputPath.toString())) {
                document.write(fos);
            }
        }
        
        result.put("fileName", fileName);
        result.put("filePath", outputPath.toString());
        result.put("fileSize", Files.size(outputPath));
        result.put("downloadUrl", "/api/documents/download/" + fileName);
        
        return result;
    }

    /**
     * 从 Markdown 生成 PPT
     */
    public Map<String, Object> generatePptFromMarkdown(String markdownContent, String template) throws IOException {
        Map<String, Object> result = new HashMap<>();
        result.put("fileName", "ppt_placeholder.txt");
        result.put("filePath", "./storage/documents/ppt_placeholder.txt");
        result.put("fileSize", 0);
        result.put("slideCount", 0);
        result.put("downloadUrl", "/api/documents/download/ppt_placeholder.txt");
        return result;
    }

    /**
     * 下载文档
     */
    public byte[] downloadDocument(String fileName) throws IOException {
        Path filePath = Paths.get(OUTPUT_DIR).resolve(fileName);
        if (!Files.exists(filePath)) {
            throw new FileNotFoundException("文件不存在：" + fileName);
        }
        return Files.readAllBytes(filePath);
    }

    /**
     * 获取文档历史
     */
    public java.util.List<Map<String, Object>> getDocumentHistory(Long userId, int limit) {
        // 从数据库或文件系统获取
        java.util.List<Map<String, Object>> history = new java.util.ArrayList<>();
        
        try {
            Path outputDir = Paths.get(OUTPUT_DIR);
            if (Files.exists(outputDir)) {
                try (var stream = Files.list(outputDir)) {
                    stream
                        .filter(Files::isRegularFile)
                        .limit(limit)
                        .forEach(path -> {
                            Map<String, Object> info = new HashMap<>();
                            info.put("fileName", path.getFileName().toString());
                            info.put("fileSize", path.toFile().length());
                            info.put("createdAt", path.toFile().lastModified());
                            history.add(info);
                        });
                }
            }
        } catch (IOException e) {
            log.error("获取文档历史失败", e);
        }
        
        return history;
    }
}
