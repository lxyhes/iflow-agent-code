package com.iflow.agent.service.office;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Excel 分析服务
 * 支持 Excel 文件分析、数据清洗、美化等功能
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelAnalysisService {

    /**
     * 分析 Excel 文件
     */
    public Map<String, Object> analyzeExcel(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            // 基本信息
            result.put("fileName", file.getOriginalFilename());
            result.put("fileSize", file.getSize());
            result.put("sheetCount", workbook.getNumberOfSheets());
            
            // 分析每个工作表
            List<Map<String, Object>> sheets = new ArrayList<>();
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                sheets.add(analyzeSheet(sheet));
            }
            result.put("sheets", sheets);
            
            // 数据统计
            result.put("statistics", calculateStatistics(workbook));
        }
        
        return result;
    }

    /**
     * 美化 Excel
     */
    public byte[] beautifyExcel(MultipartFile file) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            
            // 创建样式
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle altRowStyle = createAltRowStyle(workbook);
            
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                applyStyles(sheet, headerStyle, dataStyle, altRowStyle);
                autoSizeColumns(sheet);
            }
            
            // 输出到字节数组
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                workbook.write(baos);
                return baos.toByteArray();
            }
        }
    }

    /**
     * 生成图表数据
     */
    public Map<String, Object> generateChartData(MultipartFile file, String sheetName,
                                                  int xColumn, int yColumn) throws IOException {
        Map<String, Object> chartData = new HashMap<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet;
            if (sheetName != null) {
                sheet = workbook.getSheet(sheetName);
            } else {
                sheet = workbook.getSheetAt(0);
            }

            List<String> labels = new ArrayList<>();
            List<Number> values = new ArrayList<>();

            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // 跳过标题行

                Cell xCell = row.getCell(xColumn);
                Cell yCell = row.getCell(yColumn);

                if (xCell != null && yCell != null) {
                    labels.add(getCellValueAsString(xCell));
                    values.add(getCellValueAsNumber(yCell));
                }
            }
            
            chartData.put("labels", labels);
            chartData.put("values", values);
            chartData.put("xColumn", xColumn);
            chartData.put("yColumn", yColumn);
        }
        
        return chartData;
    }

    /**
     * 数据清洗
     */
    public Map<String, Object> cleanData(MultipartFile file, Map<String, Object> options) throws IOException {
        Map<String, Object> result = new HashMap<>();
        int removedRows = 0;
        int filledCells = 0;
        
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            
            boolean removeEmptyRows = (boolean) options.getOrDefault("removeEmptyRows", true);
            boolean fillEmptyCells = (boolean) options.getOrDefault("fillEmptyCells", false);
            String fillValue = (String) options.getOrDefault("fillValue", "");
            
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                
                if (removeEmptyRows) {
                    removedRows += removeEmptyRows(sheet);
                }
                
                if (fillEmptyCells) {
                    filledCells += fillEmptyCells(sheet, fillValue);
                }
            }
            
            result.put("removedRows", removedRows);
            result.put("filledCells", filledCells);
            
            // 输出清洗后的文件
            try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
                workbook.write(baos);
                result.put("fileData", Base64.getEncoder().encodeToString(baos.toByteArray()));
            }
        }
        
        return result;
    }

    // ===== 辅助方法 =====

    /**
     * 分析工作表
     */
    private Map<String, Object> analyzeSheet(Sheet sheet) {
        Map<String, Object> info = new HashMap<>();
        info.put("sheetName", sheet.getSheetName());
        info.put("lastRowNum", sheet.getLastRowNum());
        info.put("physicalRowCount", sheet.getPhysicalNumberOfRows());
        
        // 分析列
        int maxColumns = 0;
        for (Row row : sheet) {
            maxColumns = Math.max(maxColumns, row.getLastCellNum());
        }
        info.put("columnCount", maxColumns);
        
        // 检测是否有标题行
        if (sheet.getRow(0) != null) {
            List<String> headers = new ArrayList<>();
            Row headerRow = sheet.getRow(0);
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                headers.add(getCellValueAsString(headerRow.getCell(i)));
            }
            info.put("headers", headers);
        }
        
        return info;
    }

    /**
     * 计算统计信息
     */
    private Map<String, Object> calculateStatistics(Workbook workbook) {
        Map<String, Object> stats = new HashMap<>();
        int totalRows = 0;
        int totalCells = 0;
        int numericCells = 0;
        int stringCells = 0;
        int emptyCells = 0;
        
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            Sheet sheet = workbook.getSheetAt(i);
            for (Row row : sheet) {
                totalRows++;
                for (Cell cell : row) {
                    totalCells++;
                    switch (cell.getCellType()) {
                        case NUMERIC -> numericCells++;
                        case STRING -> stringCells++;
                        case BLANK -> emptyCells++;
                    }
                }
            }
        }
        
        stats.put("totalRows", totalRows);
        stats.put("totalCells", totalCells);
        stats.put("numericCells", numericCells);
        stats.put("stringCells", stringCells);
        stats.put("emptyCells", emptyCells);
        
        if (totalCells > 0) {
            stats.put("fillRate", new BigDecimal((totalCells - emptyCells) * 100.0 / totalCells)
                .setScale(2, RoundingMode.HALF_UP).doubleValue());
        }
        
        return stats;
    }

    /**
     * 创建标题样式
     */
    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        font.setColor(IndexedColors.WHITE.getIndex());
        
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        
        return style;
    }

    /**
     * 创建数据样式
     */
    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * 创建交替行样式
     */
    private CellStyle createAltRowStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    /**
     * 应用样式
     */
    private void applyStyles(Sheet sheet, CellStyle headerStyle, CellStyle dataStyle, CellStyle altRowStyle) {
        // 标题行
        if (sheet.getRow(0) != null) {
            Row headerRow = sheet.getRow(0);
            for (Cell cell : headerRow) {
                cell.setCellStyle(headerStyle);
            }
        }
        
        // 数据行
        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            
            CellStyle style = (i % 2 == 0) ? altRowStyle : dataStyle;
            for (Cell cell : row) {
                cell.setCellStyle(style);
            }
        }
    }

    /**
     * 自动调整列宽
     */
    private void autoSizeColumns(Sheet sheet) {
        if (sheet.getRow(0) == null) return;
        
        Row headerRow = sheet.getRow(0);
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            sheet.autoSizeColumn(i);
            // 设置最小和最大宽度
            int width = sheet.getColumnWidth(i);
            width = Math.max(width, 20 * 256); // 最小 20 字符
            width = Math.min(width, 50 * 256); // 最大 50 字符
            sheet.setColumnWidth(i, width);
        }
    }

    /**
     * 删除空行
     */
    private int removeEmptyRows(Sheet sheet) {
        int count = 0;
        List<Integer> emptyRows = new ArrayList<>();
        
        for (Row row : sheet) {
            if (isRowEmpty(row)) {
                emptyRows.add(row.getRowNum());
            }
        }
        
        // 从后往前删除，避免索引问题
        for (int i = emptyRows.size() - 1; i >= 0; i--) {
            int rowNum = emptyRows.get(i);
            Row row = sheet.getRow(rowNum);
            if (row != null) {
                sheet.removeRow(row);
                count++;
            }
        }
        
        return count;
    }

    /**
     * 填充空单元格
     */
    private int fillEmptyCells(Sheet sheet, String fillValue) {
        int count = 0;
        
        for (Row row : sheet) {
            for (Cell cell : row) {
                if (cell.getCellType() == CellType.BLANK) {
                    cell.setCellValue(fillValue);
                    count++;
                }
            }
        }
        
        return count;
    }

    /**
     * 检查行是否为空
     */
    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (Cell cell : row) {
            if (cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }

    /**
     * 获取单元格值作为字符串
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }

    /**
     * 获取单元格值作为数字
     */
    private Number getCellValueAsNumber(Cell cell) {
        if (cell == null) return 0;
        
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                try {
                    yield Double.parseDouble(cell.getStringCellValue());
                } catch (NumberFormatException e) {
                    yield 0;
                }
            }
            default -> 0;
        };
    }
}
