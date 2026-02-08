package com.iflow.agent.domain.resume.service;

import com.iflow.agent.domain.resume.entity.*;

import java.util.List;
import java.util.Optional;

/**
 * 简历服务接口 - 对应 Python 的 ResumeService
 */
public interface ResumeService {

    // ========== 简历基本操作 ==========
    List<Resume> getResumes(String userId);

    Optional<Resume> getResume(String resumeId);

    Resume createResume(String userId, String name, String targetPosition, String template);

    Resume updateResume(String resumeId, Resume updates);

    void deleteResume(String resumeId);

    // ========== 个人信息 ==========
    PersonalInfo updatePersonalInfo(String resumeId, PersonalInfo info);

    // ========== 工作经历 ==========
    WorkExperience addWorkExperience(String resumeId, WorkExperience experience);

    WorkExperience updateWorkExperience(Long expId, WorkExperience experience);

    void deleteWorkExperience(Long expId);

    void updateWorkExperienceOrder(String resumeId, List<Long> order);

    // ========== 教育经历 ==========
    Education addEducation(String resumeId, Education education);

    Education updateEducation(Long eduId, Education education);

    void deleteEducation(Long eduId);

    // ========== 技能 ==========
    Skill addSkill(String resumeId, Skill skill);

    Skill updateSkill(Long skillId, Skill skill);

    Resume deleteSkill(String resumeId, Long skillId);

    // ========== 项目经历 ==========
    Project addProject(String resumeId, Project project);

    Project updateProject(Long projectId, Project project);

    void deleteProject(Long projectId);

    // ========== AI 功能 ==========
    String optimizeResume(String resumeId, String jobDescription);

    String generateCoverLetter(String resumeId, String company, String position, String jobDescription);

    String matchJob(String resumeId, String jobDescription);
}
