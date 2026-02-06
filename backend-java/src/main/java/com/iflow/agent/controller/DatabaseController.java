package com.iflow.agent.controller;

import com.iflow.agent.domain.database.entity.DatabaseConfig;
import com.iflow.agent.domain.database.service.DatabaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据库管理 API - 对应 Python 的 database.py
 */
@Slf4j
@RestController
@RequestMapping("/api/database")
@RequiredArgsConstructor
public class DatabaseController {

    private final DatabaseService databaseService;

    // ========== 连接管理 ==========

    @PostMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect(@RequestBody ConnectRequest request) {
        log.info("连接数据库: {}:{}/{}", request.getHost(), request.getPort(), request.getDatabase());
        String connectionName = databaseService.connect(request.toConfig());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "connection_name", connectionName,
                "message", "数据库连接成功"
        ));
    }

    @PostMapping("/disconnect/{connectionName}")
    public ResponseEntity<Map<String, Object>> disconnect(@PathVariable String connectionName) {
        log.info("断开数据库连接: {}", connectionName);
        databaseService.disconnect(connectionName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "数据库连接已断开"
        ));
    }

    @GetMapping("/connections")
    public ResponseEntity<Map<String, Object>> listConnections() {
        log.info("获取数据库连接列表");
        List<Map<String, Object>> connections = databaseService.listConnections();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "connections", connections
        ));
    }

    // ========== 查询执行 ==========

    @PostMapping("/query/{connectionName}")
    public ResponseEntity<Map<String, Object>> executeQuery(
            @PathVariable String connectionName,
            @RequestBody QueryRequest request) {
        log.info("执行查询: {}", connectionName);
        Map<String, Object> result = databaseService.executeQuery(connectionName, request.getQuery());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/execute/{connectionName}")
    public ResponseEntity<Map<String, Object>> execute(
            @PathVariable String connectionName,
            @RequestBody ExecuteRequest request) {
        log.info("执行SQL: {}", connectionName);
        Map<String, Object> result = databaseService.execute(connectionName, request.getSql());
        return ResponseEntity.ok(result);
    }

    // ========== Schema 操作 ==========

    @GetMapping("/schema/{connectionName}")
    public ResponseEntity<Map<String, Object>> getSchema(@PathVariable String connectionName) {
        log.info("获取数据库Schema: {}", connectionName);
        Map<String, Object> schema = databaseService.getSchema(connectionName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "schema", schema
        ));
    }

    @GetMapping("/tables/{connectionName}")
    public ResponseEntity<Map<String, Object>> getTables(@PathVariable String connectionName) {
        log.info("获取表列表: {}", connectionName);
        List<String> tables = databaseService.getTables(connectionName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "tables", tables
        ));
    }

    @GetMapping("/tables/{connectionName}/{tableName}/columns")
    public ResponseEntity<Map<String, Object>> getTableColumns(
            @PathVariable String connectionName,
            @PathVariable String tableName) {
        log.info("获取表列信息: {}.{}", connectionName, tableName);
        List<Map<String, Object>> columns = databaseService.getTableColumns(connectionName, tableName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "columns", columns
        ));
    }

    @GetMapping("/tables/{connectionName}/{tableName}/indexes")
    public ResponseEntity<Map<String, Object>> getTableIndexes(
            @PathVariable String connectionName,
            @PathVariable String tableName) {
        log.info("获取表索引: {}.{}", connectionName, tableName);
        List<Map<String, Object>> indexes = databaseService.getTableIndexes(connectionName, tableName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "indexes", indexes
        ));
    }

    // ========== 导出功能 ==========

    @GetMapping("/export/{connectionName}/{format}")
    public ResponseEntity<byte[]> exportQueryResult(
            @PathVariable String connectionName,
            @PathVariable String format,
            @RequestParam String query) {
        log.info("导出查询结果: {}, format={}", connectionName, format);

        byte[] data = databaseService.exportQueryResult(connectionName, query, format);

        String filename = "export." + format;
        MediaType mediaType = switch (format.toLowerCase()) {
            case "csv" -> MediaType.parseMediaType("text/csv");
            case "json" -> MediaType.APPLICATION_JSON;
            case "xlsx" -> MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(data);
    }

    // ========== 配置管理 ==========

    @PostMapping("/save-config")
    public ResponseEntity<Map<String, Object>> saveConfig(
            @RequestBody SaveConfigRequest request) {
        log.info("保存数据库配置: {}", request.getConfigName());

        DatabaseConfig config = DatabaseConfig.builder()
                .name(request.getConfigName())
                .projectName(request.getProjectName())
                .dbType(request.getDbType())
                .host(request.getHost())
                .port(request.getPort())
                .database(request.getDatabase())
                .username(request.getUsername())
                .password(request.getPassword())
                .build();

        databaseService.saveConfig(config);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "配置已保存"
        ));
    }

    @GetMapping("/configs/{projectName}")
    public ResponseEntity<Map<String, Object>> getProjectConfigs(@PathVariable String projectName) {
        log.info("获取项目数据库配置: {}", projectName);
        List<DatabaseConfig> configs = databaseService.getConfigsByProject(projectName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "configs", configs
        ));
    }

    @DeleteMapping("/config/{projectName}/{configName}")
    public ResponseEntity<Map<String, Object>> deleteConfig(
            @PathVariable String projectName,
            @PathVariable String configName) {
        log.info("删除数据库配置: {}/{}", projectName, configName);
        databaseService.deleteConfig(projectName, configName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "配置已删除"
        ));
    }

    @GetMapping("/project-databases/{projectName}")
    public ResponseEntity<Map<String, Object>> getProjectDatabases(@PathVariable String projectName) {
        log.info("获取项目所有数据库: {}", projectName);
        List<Map<String, Object>> databases = databaseService.getProjectDatabases(projectName);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "databases", databases
        ));
    }

    // ========== 请求类 ==========

    @lombok.Data
    public static class ConnectRequest {
        private String dbType = "mysql";
        private String host;
        private Integer port = 3306;
        private String database;
        private String username;
        private String password;

        public DatabaseConfig toConfig() {
            return DatabaseConfig.builder()
                    .dbType(dbType)
                    .host(host)
                    .port(port)
                    .database(database)
                    .username(username)
                    .password(password)
                    .build();
        }
    }

    @lombok.Data
    public static class QueryRequest {
        private String query;
    }

    @lombok.Data
    public static class ExecuteRequest {
        private String sql;
    }

    @lombok.Data
    public static class SaveConfigRequest {
        private String configName;
        private String projectName;
        private String dbType;
        private String host;
        private Integer port;
        private String database;
        private String username;
        private String password;
    }
}
