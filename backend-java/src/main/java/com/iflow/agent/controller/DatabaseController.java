package com.iflow.agent.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 数据库查询 API - 对应 Python 的 database.py
 */
@Slf4j
@RestController
@RequestMapping("/api/database")
@RequiredArgsConstructor
public class DatabaseController {

    /**
     * 连接数据库
     */
    @PostMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect(@RequestBody Map<String, String> request) {
        String type = request.get("type");
        String host = request.get("host");
        String database = request.get("database");

        log.info("Connecting to database: {} at {}", database, host);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Connected to " + type + " database",
                "connection_id", "conn_" + System.currentTimeMillis()
        ));
    }

    /**
     * 断开连接
     */
    @PostMapping("/disconnect/{connectionName}")
    public ResponseEntity<Map<String, Object>> disconnect(@PathVariable String connectionName) {
        log.info("Disconnecting: {}", connectionName);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Disconnected"
        ));
    }

    /**
     * 获取连接列表
     */
    @GetMapping("/connections")
    public ResponseEntity<Map<String, Object>> getConnections() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "connections", List.of()
        ));
    }

    /**
     * 获取表列表
     */
    @GetMapping("/tables/{connectionName}")
    public ResponseEntity<Map<String, Object>> getTables(@PathVariable String connectionName) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "tables", List.of(
                        Map.of("name", "users", "rows", 100),
                        Map.of("name", "orders", "rows", 500)
                )
        ));
    }

    /**
     * 获取表详情
     */
    @GetMapping("/table/{connectionName}/{tableName}")
    public ResponseEntity<Map<String, Object>> getTableInfo(
            @PathVariable String connectionName,
            @PathVariable String tableName) {

        return ResponseEntity.ok(Map.of(
                "success", true,
                "table", tableName,
                "columns", List.of(
                        Map.of("name", "id", "type", "INTEGER", "nullable", false),
                        Map.of("name", "name", "type", "VARCHAR", "nullable", true)
                )
        ));
    }

    /**
     * 执行查询
     */
    @PostMapping("/query")
    public ResponseEntity<Map<String, Object>> executeQuery(@RequestBody Map<String, String> request) {
        String sql = request.get("sql");
        log.info("Executing query: {}", sql);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "query", sql,
                "rows", List.of(
                        Map.of("id", 1, "name", "Test"),
                        Map.of("id", 2, "name", "Demo")
                ),
                "count", 2
        ));
    }

    /**
     * 获取查询模板
     */
    @GetMapping("/templates")
    public ResponseEntity<Map<String, Object>> getTemplates() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "templates", List.of(
                        Map.of("name", "Select All", "sql", "SELECT * FROM table_name"),
                        Map.of("name", "Count", "sql", "SELECT COUNT(*) FROM table_name")
                )
        ));
    }

    /**
     * 获取查询历史
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "history", List.of()
        ));
    }
}
