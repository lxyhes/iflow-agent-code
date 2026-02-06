package com.iflow.agent.domain.database.service;

import com.iflow.agent.domain.database.entity.DatabaseConfig;

import java.util.List;
import java.util.Map;

/**
 * 数据库服务接口
 */
public interface DatabaseService {

    /**
     * 连接数据库
     */
    String connect(DatabaseConfig config);

    /**
     * 断开数据库连接
     */
    void disconnect(String connectionName);

    /**
     * 列出所有连接
     */
    List<Map<String, Object>> listConnections();

    /**
     * 执行查询
     */
    Map<String, Object> executeQuery(String connectionName, String query);

    /**
     * 执行SQL
     */
    Map<String, Object> execute(String connectionName, String sql);

    /**
     * 获取数据库Schema
     */
    Map<String, Object> getSchema(String connectionName);

    /**
     * 获取表列表
     */
    List<String> getTables(String connectionName);

    /**
     * 获取表列信息
     */
    List<Map<String, Object>> getTableColumns(String connectionName, String tableName);

    /**
     * 获取表索引
     */
    List<Map<String, Object>> getTableIndexes(String connectionName, String tableName);

    /**
     * 导出查询结果
     */
    byte[] exportQueryResult(String connectionName, String query, String format);

    /**
     * 保存配置
     */
    void saveConfig(DatabaseConfig config);

    /**
     * 获取项目配置
     */
    List<DatabaseConfig> getConfigsByProject(String projectName);

    /**
     * 删除配置
     */
    void deleteConfig(String projectName, String configName);

    /**
     * 获取项目所有数据库
     */
    List<Map<String, Object>> getProjectDatabases(String projectName);
}
