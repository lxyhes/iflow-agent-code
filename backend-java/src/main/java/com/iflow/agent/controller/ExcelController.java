package com.iflow.agent.controller;

import com.iflow.agent.service.office.ExcelAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Excel 处理控制器
 */
@RestController
@RequestMapping("/api/excel")
@RequiredArgsConstructor
@Slf4j
public class ExcelController {

    private final ExcelAnalysisService excelService;

    /**
     * 分析 Excel 文件
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeExcel(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            Map<String, Object> result = excelService.analyzeExcel(file);
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            log.error("Excel 分析失败", e);
            return ResponseEntity.internalServerError().body("Excel 分析失败：" + e.getMessage());
        }
    }

    /**
     * 美化 Excel
     */
    @PostMapping("/beautify")
    public ResponseEntity<?> beautifyExcel(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            byte[] beautifiedData = excelService.beautifyExcel(file);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "beautified_" + file.getOriginalFilename());
            
            return new ResponseEntity<>(beautifiedData, headers, HttpStatus.OK);

        } catch (IOException e) {
            log.error("Excel 美化失败", e);
            return ResponseEntity.internalServerError().body("Excel 美化失败：" + e.getMessage());
        }
    }

    /**
     * 生成图表数据
     */
    @PostMapping("/generate-chart")
    public ResponseEntity<?> generateChartData(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "0") int sheetIndex,
            @RequestParam(defaultValue = "0") int xColumn,
            @RequestParam(defaultValue = "1") int yColumn) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            Map<String, Object> chartData = excelService.generateChartData(
                file, null, xColumn, yColumn);
            return ResponseEntity.ok(chartData);

        } catch (IOException e) {
            log.error("生成图表数据失败", e);
            return ResponseEntity.internalServerError().body("生成图表数据失败：" + e.getMessage());
        }
    }

    /**
     * 数据清洗
     */
    @PostMapping("/clean-data")
    public ResponseEntity<?> cleanData(
            @RequestParam("file") MultipartFile file,
            @RequestBody(required = false) Map<String, Object> options) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("文件不能为空");
            }

            Map<String, Object> result = excelService.cleanData(file, 
                options != null ? options : Map.of());
            return ResponseEntity.ok(result);

        } catch (IOException e) {
            log.error("数据清洗失败", e);
            return ResponseEntity.internalServerError().body("数据清洗失败：" + e.getMessage());
        }
    }
}
