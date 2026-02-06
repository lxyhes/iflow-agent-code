package com.iflow.agent.domain.project.service;

import com.iflow.agent.domain.project.entity.WorkspaceProject;
import com.iflow.agent.domain.project.entity.ProjectSession;
import com.iflow.agent.domain.project.entity.SessionMessage;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 项目服务接口
 */
public interface ProjectService {

    /**
     * 获取所有项目
     */
    List<WorkspaceProject> getProjects(String userId);

    /**
     * 获取项目详情
     */
    Optional<WorkspaceProject> getProject(String projectName);

    /**
     * 创建项目
     */
    WorkspaceProject createProject(String path, String userId);

    /**
     * 重命名项目
     */
    WorkspaceProject renameProject(String projectName, String displayName);

    /**
     * 删除项目
     */
    void deleteProject(String projectName);

    /**
     * 获取项目会话列表
     */
    Map<String, Object> getSessions(String projectName, int limit, int offset);

    /**
     * 创建会话
     */
    ProjectSession createSession(String projectName, String title, String model, String userId);

    /**
     * 删除会话
     */
    void deleteSession(String sessionId);

    /**
     * 获取会话消息
     */
    Map<String, Object> getSessionMessages(String sessionId, Integer limit, Integer offset);

    /**
     * 添加消息
     */
    SessionMessage addMessage(String sessionId, String role, String content);

    /**
     * 读取文件
     */
    Map<String, Object> readFile(String projectName, String filePath);

    /**
     * 保存文件
     */
    Map<String, Object> saveFile(String projectName, String filePath, String content);

    /**
     * 获取项目文件列表
     */
    Map<String, Object> getProjectFiles(String projectName);
}
