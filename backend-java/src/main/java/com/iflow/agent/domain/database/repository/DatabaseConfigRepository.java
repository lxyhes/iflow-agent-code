package com.iflow.agent.domain.database.repository;

import com.iflow.agent.domain.database.entity.DatabaseConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 数据库配置仓储
 */
@Repository
public interface DatabaseConfigRepository extends JpaRepository<DatabaseConfig, String> {

    List<DatabaseConfig> findByProjectName(String projectName);

    Optional<DatabaseConfig> findByProjectNameAndName(String projectName, String name);

    void deleteByProjectNameAndName(String projectName, String name);
}
