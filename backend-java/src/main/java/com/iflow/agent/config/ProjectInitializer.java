package com.iflow.agent.config;

import com.iflow.agent.domain.project.entity.WorkspaceProject;
import com.iflow.agent.domain.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.File;

/**
 * 项目初始化器 - 自动添加当前工作目录为项目
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectInitializer implements CommandLineRunner {

    private final ProjectRepository projectRepository;

    @Override
    public void run(String... args) {
        // 获取当前工作目录
        String currentDir = System.getProperty("user.dir");
        File dir = new File(currentDir);
        String projectName = dir.getName();

        // 如果项目不存在，则创建
        if (!projectRepository.existsByName(projectName)) {
            log.info("自动创建项目: {} -> {}", projectName, currentDir);
            
            WorkspaceProject project = WorkspaceProject.builder()
                    .name(projectName)
                    .displayName(projectName)
                    .path(currentDir)
                    .description("Auto-initialized project")
                    .createdBy("system")
                    .build();
            
            projectRepository.save(project);
            log.info("项目创建成功: {}", projectName);
        } else {
            log.info("项目已存在: {}", projectName);
        }

        // 同时添加 iflow-agent-code 项目
        String agentCodePath = "/Users/hb/Downloads/iflow-agent/iflow-agent-code";
        File agentCodeDir = new File(agentCodePath);
        if (agentCodeDir.exists() && !projectRepository.existsByName("iflow-agent-code")) {
            log.info("自动创建项目: iflow-agent-code -> {}", agentCodePath);
            
            WorkspaceProject project = WorkspaceProject.builder()
                    .name("iflow-agent-code")
                    .displayName("IFlow Agent Code")
                    .path(agentCodePath)
                    .description("IFlow Agent Project")
                    .createdBy("system")
                    .build();
            
            projectRepository.save(project);
            log.info("项目创建成功: iflow-agent-code");
        }
    }
}
