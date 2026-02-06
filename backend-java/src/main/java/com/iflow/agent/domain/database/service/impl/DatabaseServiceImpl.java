package com.iflow.agent.domain.database.service.impl;

import com.iflow.agent.domain.database.entity.DatabaseConfig;
import com.iflow.agent.domain.database.repository.DatabaseConfigRepository;
import com.iflow.agent.domain.database.service.DatabaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 数据库服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseServiceImpl implements DatabaseService {

    private final DatabaseConfigRepository configRepository;

    // 连接缓存
    private final Map<String, Connection> connections = new ConcurrentHashMap<>();
    private final Map<String, DatabaseConfig> connectionConfigs = new ConcurrentHashMap<>();

    @Override
    public String connect(DatabaseConfig config) {
        String connectionName = config.getDatabase() + "_" + System.currentTimeMillis();

        try {
            // 加载驱动
            String driverClass = switch (config.getDbType().toLowerCase()) {
                case "mysql" -> "com.mysql.cj.jdbc.Driver";
                case "postgresql", "postgres" -> "org.postgresql.Driver";
                case "sqlite" -> "org.sqlite.JDBC";
                default -> throw new IllegalArgumentException("不支持的数据库类型: " + config.getDbType());
            };

            Class.forName(driverClass);

            // 构建连接URL
            String url = switch (config.getDbType().toLowerCase()) {
                case "mysql" -> String.format("jdbc:mysql://%s:%d/%s?useSSL=false&serverTimezone=UTC",
                        config.getHost(), config.getPort(), config.getDatabase());
                case "postgresql", "postgres" -> String.format("jdbc:postgresql://%s:%d/%s",
                        config.getHost(), config.getPort(), config.getDatabase());
                case "sqlite" -> String.format("jdbc:sqlite:%s", config.getDatabase());
                default -> throw new IllegalArgumentException("不支持的数据库类型: " + config.getDbType());
            };

            Connection conn = DriverManager.getConnection(url, config.getUsername(), config.getPassword());
            connections.put(connectionName, conn);
            connectionConfigs.put(connectionName, config);

            log.info("数据库连接成功: {}", connectionName);
            return connectionName;

        } catch (Exception e) {
            log.error("数据库连接失败", e);
            throw new RuntimeException("数据库连接失败: " + e.getMessage(), e);
        }
    }

    @Override
    public void disconnect(String connectionName) {
        Connection conn = connections.remove(connectionName);
        if (conn != null) {
            try {
                conn.close();
                log.info("数据库连接已断开: {}", connectionName);
            } catch (SQLException e) {
                log.warn("关闭数据库连接失败", e);
            }
        }
        connectionConfigs.remove(connectionName);
    }

    @Override
    public List<Map<String, Object>> listConnections() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, DatabaseConfig> entry : connectionConfigs.entrySet()) {
            DatabaseConfig config = entry.getValue();
            result.add(Map.of(
                    "connection_name", entry.getKey(),
                    "db_type", config.getDbType(),
                    "host", config.getHost(),
                    "port", config.getPort(),
                    "database", config.getDatabase(),
                    "connected", connections.containsKey(entry.getKey())
            ));
        }
        return result;
    }

    @Override
    public Map<String, Object> executeQuery(String connectionName, String query) {
        Connection conn = connections.get(connectionName);
        if (conn == null) {
            throw new IllegalArgumentException("连接不存在: " + connectionName);
        }

        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {

            ResultSetMetaData metaData = rs.getMetaData();
            int columnCount = metaData.getColumnCount();

            List<String> columns = new ArrayList<>();
            for (int i = 1; i <= columnCount; i++) {
                columns.add(metaData.getColumnName(i));
            }

            List<List<Object>> rows = new ArrayList<>();
            while (rs.next()) {
                List<Object> row = new ArrayList<>();
                for (int i = 1; i <= columnCount; i++) {
                    row.add(rs.getObject(i));
                }
                rows.add(row);
            }

            return Map.of(
                    "success", true,
                    "columns", columns,
                    "rows", rows,
                    "row_count", rows.size()
            );

        } catch (SQLException e) {
            log.error("查询执行失败", e);
            throw new RuntimeException("查询执行失败: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> execute(String connectionName, String sql) {
        Connection conn = connections.get(connectionName);
        if (conn == null) {
            throw new IllegalArgumentException("连接不存在: " + connectionName);
        }

        try (Statement stmt = conn.createStatement()) {
            boolean hasResultSet = stmt.execute(sql);

            if (hasResultSet) {
                return executeQuery(connectionName, sql);
            } else {
                int updateCount = stmt.getUpdateCount();
                return Map.of(
                        "success", true,
                        "affected_rows", updateCount,
                        "message", "执行成功"
                );
            }

        } catch (SQLException e) {
            log.error("SQL执行失败", e);
            throw new RuntimeException("SQL执行失败: " + e.getMessage(), e);
        }
    }

    @Override
    public Map<String, Object> getSchema(String connectionName) {
        Connection conn = connections.get(connectionName);
        if (conn == null) {
            throw new IllegalArgumentException("连接不存在: " + connectionName);
        }

        try {
            DatabaseMetaData metaData = conn.getMetaData();

            List<String> tables = new ArrayList<>();
            try (ResultSet rs = metaData.getTables(null, null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tables.add(rs.getString("TABLE_NAME"));
                }
            }

            return Map.of(
                    "success", true,
                    "database_product_name", metaData.getDatabaseProductName(),
                    "database_product_version", metaData.getDatabaseProductVersion(),
                    "tables", tables
            );

        } catch (SQLException e) {
            log.error("获取Schema失败", e);
            throw new RuntimeException("获取Schema失败: " + e.getMessage(), e);
        }
    }

    @Override
    public List<String> getTables(String connectionName) {
        Connection conn = connections.get(connectionName);
        if (conn == null) {
            throw new IllegalArgumentException("连接不存在: " + connectionName);
        }

        List<String> tables = new ArrayList<>();
        try {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getTables(null, null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tables.add(rs.getString("TABLE_NAME"));
                }
            }
        } catch (SQLException e) {
            log.error("获取表列表失败", e);
        }
        return tables;
    }

    @Override
    public List<Map<String, Object>> getTableColumns(String connectionName, String tableName) {
        Connection conn = connections.get(connectionName);
        if (conn == null) {
            throw new IllegalArgumentException("连接不存在: " + connectionName);
        }

        List<Map<String, Object>> columns = new ArrayList<>();
        try {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getColumns(null, null, tableName, "%")) {
                while (rs.next()) {
                    columns.add(Map.of(
                            "name", rs.getString("COLUMN_NAME"),
                            "type", rs.getString("TYPE_NAME"),
                            "size", rs.getInt("COLUMN_SIZE"),
                            "nullable", rs.getBoolean("NULLABLE")
                    ));
                }
            }
        } catch (SQLException e) {
            log.error("获取列信息失败", e);
        }
        return columns;
    }

    @Override
    public List<Map<String, Object>> getTableIndexes(String connectionName, String tableName) {
        Connection conn = connections.get(connectionName);
        if (conn == null) {
            throw new IllegalArgumentException("连接不存在: " + connectionName);
        }

        List<Map<String, Object>> indexes = new ArrayList<>();
        try {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getIndexInfo(null, null, tableName, false, false)) {
                while (rs.next()) {
                    indexes.add(Map.of(
                            "name", rs.getString("INDEX_NAME"),
                            "column", rs.getString("COLUMN_NAME"),
                            "unique", !rs.getBoolean("NON_UNIQUE")
                    ));
                }
            }
        } catch (SQLException e) {
            log.error("获取索引失败", e);
        }
        return indexes;
    }

    @Override
    public byte[] exportQueryResult(String connectionName, String query, String format) {
        Map<String, Object> result = executeQuery(connectionName, query);

        @SuppressWarnings("unchecked")
        List<String> columns = (List<String>) result.get("columns");

        @SuppressWarnings("unchecked")
        List<List<Object>> rows = (List<List<Object>>) result.get("rows");

        return switch (format.toLowerCase()) {
            case "csv" -> exportToCsv(columns, rows);
            case "json" -> exportToJson(columns, rows);
            default -> exportToCsv(columns, rows);
        };
    }

    private byte[] exportToCsv(List<String> columns, List<List<Object>> rows) {
        StringBuilder sb = new StringBuilder();

        // 表头
        sb.append(String.join(",", columns)).append("\n");

        // 数据
        for (List<Object> row : rows) {
            List<String> values = new ArrayList<>();
            for (Object value : row) {
                String str = value != null ? value.toString() : "";
                // 处理包含逗号的值
                if (str.contains(",") || str.contains("\"") || str.contains("\n")) {
                    str = "\"" + str.replace("\"", "\"\"") + "\"";
                }
                values.add(str);
            }
            sb.append(String.join(",", values)).append("\n");
        }

        return sb.toString().getBytes();
    }

    private byte[] exportToJson(List<String> columns, List<List<Object>> rows) {
        List<Map<String, Object>> data = new ArrayList<>();
        for (List<Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            for (int i = 0; i < columns.size(); i++) {
                item.put(columns.get(i), row.get(i));
            }
            data.add(item);
        }

        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .writerWithDefaultPrettyPrinter()
                    .writeValueAsBytes(data);
        } catch (Exception e) {
            return "[]".getBytes();
        }
    }

    @Override
    public void saveConfig(DatabaseConfig config) {
        configRepository.save(config);
    }

    @Override
    public List<DatabaseConfig> getConfigsByProject(String projectName) {
        return configRepository.findByProjectName(projectName);
    }

    @Override
    public void deleteConfig(String projectName, String configName) {
        configRepository.deleteByProjectNameAndName(projectName, configName);
    }

    @Override
    public List<Map<String, Object>> getProjectDatabases(String projectName) {
        List<DatabaseConfig> configs = configRepository.findByProjectName(projectName);
        List<Map<String, Object>> result = new ArrayList<>();

        for (DatabaseConfig config : configs) {
            result.add(Map.of(
                    "name", config.getName(),
                    "db_type", config.getDbType(),
                    "host", config.getHost(),
                    "port", config.getPort(),
                    "database", config.getDatabase()
            ));
        }

        return result;
    }
}
