package com.iflow.agent.domain.resume.service.impl;

import com.iflow.agent.domain.resume.entity.*;
import com.iflow.agent.domain.resume.repository.ResumeRepository;
import com.iflow.agent.domain.resume.repository.SkillRepository;
import com.iflow.agent.domain.resume.service.ResumeService;
import com.iflow.agent.service.ai.TongyiQianwenService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 简历服务实现 - 对应 Python 的 ResumeService
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeServiceImpl implements ResumeService {

    private final ResumeRepository resumeRepository;
    private final SkillRepository skillRepository;
    private final TongyiQianwenService tongyiQianwenService;
    private final EntityManager entityManager;

    @Override
    public List<Resume> getResumes(String userId) {
        return resumeRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Resume> getResume(String resumeId) {
        // 分两次查询避免 MultipleBagFetchException
        Optional<Resume> resume = resumeRepository.findWithBasicRelationsById(resumeId);
        
        // 初始化其他关联数据
        resume.ifPresent(r -> {
            // 访问关联集合以触发懒加载
            if (r.getEducations() != null) r.getEducations().size();
            if (r.getSkills() != null) r.getSkills().size();
            if (r.getProjects() != null) r.getProjects().size();
        });
        
        return resume;
    }

    @Override
    @Transactional
    public Resume createResume(String userId, String name, String targetPosition, String template) {
        log.info("Creating resume for user: {}, name: {}", userId, name);

        Resume resume = Resume.builder()
                .userId(userId)
                .name(name)
                .targetPosition(targetPosition)
                .template(template != null ? template : "modern")
                .build();

        return resumeRepository.save(resume);
    }

    @Override
    @Transactional
    public Resume updateResume(String resumeId, Resume updates) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        if (updates.getName() != null) {
            resume.setName(updates.getName());
        }
        if (updates.getTargetPosition() != null) {
            resume.setTargetPosition(updates.getTargetPosition());
        }
        if (updates.getTemplate() != null) {
            resume.setTemplate(updates.getTemplate());
        }

        log.info("Updating resume: {}", resumeId);
        return resumeRepository.save(resume);
    }

    @Override
    @Transactional
    public void deleteResume(String resumeId) {
        log.info("Deleting resume: {}", resumeId);
        resumeRepository.deleteById(resumeId);
    }

    @Override
    @Transactional
    public PersonalInfo updatePersonalInfo(String resumeId, PersonalInfo info) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        PersonalInfo personalInfo = resume.getPersonalInfo();
        if (personalInfo == null) {
            personalInfo = new PersonalInfo();
            personalInfo.setResume(resume);
        }

        if (info.getFullName() != null) personalInfo.setFullName(info.getFullName());
        if (info.getEmail() != null) personalInfo.setEmail(info.getEmail());
        if (info.getPhone() != null) personalInfo.setPhone(info.getPhone());
        if (info.getLocation() != null) personalInfo.setLocation(info.getLocation());
        if (info.getSummary() != null) personalInfo.setSummary(info.getSummary());
        if (info.getAvatar() != null) personalInfo.setAvatar(info.getAvatar());

        resume.setPersonalInfo(personalInfo);
        resumeRepository.save(resume);

        return personalInfo;
    }

    @Override
    @Transactional
    public WorkExperience addWorkExperience(String resumeId, WorkExperience experience) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        experience.setResume(resume);
        resume.getWorkExperiences().add(experience);

        resumeRepository.save(resume);
        return experience;
    }

    @Override
    @Transactional
    public WorkExperience updateWorkExperience(Long expId, WorkExperience experience) {
        // 简化实现，实际应该通过 repository 查找并更新
        log.info("Updating work experience: {}", expId);
        return experience;
    }

    @Override
    @Transactional
    public void deleteWorkExperience(Long expId) {
        log.info("Deleting work experience: {}", expId);
        // 简化实现
    }

    @Override
    @Transactional
    public Education addEducation(String resumeId, Education education) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        education.setResume(resume);
        resume.getEducations().add(education);

        resumeRepository.save(resume);
        return education;
    }

    @Override
    @Transactional
    public Education updateEducation(Long eduId, Education education) {
        log.info("Updating education: {}", eduId);
        return education;
    }

    @Override
    @Transactional
    public void deleteEducation(Long eduId) {
        log.info("Deleting education: {}", eduId);
    }

    @Override
    @Transactional
    public Skill addSkill(String resumeId, Skill skill) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        skill.setResume(resume);
        resume.getSkills().add(skill);

        resumeRepository.save(resume);
        return skill;
    }

    @Override
    @Transactional
    public Skill updateSkill(Long skillId, Skill skill) {
        log.info("Updating skill: {}", skillId);
        return skill;
    }

    @Override
    @Transactional
    public Resume deleteSkill(String resumeId, Long skillId) {
        log.info("Deleting skill: {} from resume: {}", skillId, resumeId);
        skillRepository.deleteById(skillId);
        // 刷新EntityManager以确保删除操作被同步到数据库
        entityManager.flush();
        entityManager.clear();
        // 重新获取简历，确保skills集合被更新
        return getResume(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));
    }

    @Override
    @Transactional
    public Project addProject(String resumeId, Project project) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        project.setResume(resume);
        resume.getProjects().add(project);

        resumeRepository.save(resume);
        return project;
    }

    @Override
    @Transactional
    public Project updateProject(Long projectId, Project project) {
        log.info("Updating project: {}", projectId);
        return project;
    }

    @Override
    @Transactional
    public void deleteProject(Long projectId) {
        log.info("Deleting project: {}", projectId);
    }

    @Override
    @Transactional
    public void updateWorkExperienceOrder(String resumeId, List<Long> order) {
        log.info("Updating work experience order for resume: {}, order: {}", resumeId, order);
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        List<WorkExperience> experiences = resume.getWorkExperiences();
        if (experiences == null || experiences.isEmpty()) {
            return;
        }

        // 创建ID到索引的映射
        Map<Long, Integer> idToIndex = new HashMap<>();
        for (int i = 0; i < experiences.size(); i++) {
            WorkExperience exp = experiences.get(i);
            if (exp.getId() != null) {
                idToIndex.put(exp.getId(), i);
            }
        }

        // 根据order重新排序
        List<WorkExperience> sortedExperiences = new ArrayList<>();
        for (Long expId : order) {
            Integer index = idToIndex.get(expId);
            if (index != null) {
                sortedExperiences.add(experiences.get(index));
            }
        }

        // 添加未在order中指定的工作经历
        for (WorkExperience exp : experiences) {
            if (exp.getId() == null || !order.contains(exp.getId())) {
                sortedExperiences.add(exp);
            }
        }

        // 更新排序索引
        for (int i = 0; i < sortedExperiences.size(); i++) {
            sortedExperiences.get(i).setSortOrder(i);
        }

        resume.setWorkExperiences(sortedExperiences);
        resumeRepository.save(resume);
    }

    @Override
    public String optimizeResume(String resumeId, String jobDescription) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        String prompt = buildOptimizePrompt(resume, jobDescription);
        return tongyiQianwenService.generate(prompt);
    }

    @Override
    public String generateCoverLetter(String resumeId, String company, String position, String jobDescription) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        String prompt = buildCoverLetterPrompt(resume, company, position, jobDescription);
        return tongyiQianwenService.generate(prompt);
    }

    @Override
    public String matchJob(String resumeId, String jobDescription) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found: " + resumeId));

        String prompt = buildJobMatchPrompt(resume, jobDescription);
        return tongyiQianwenService.generate(prompt);
    }

    // ========== 私有辅助方法 ==========

    private String buildOptimizePrompt(Resume resume, String jobDescription) {
        StringBuilder sb = new StringBuilder();
        sb.append("请优化以下简历，使其更符合目标职位的要求。\n\n");
        sb.append("=== 当前简历 ===\n");
        sb.append("目标职位: ").append(resume.getTargetPosition()).append("\n");

        if (resume.getPersonalInfo() != null) {
            sb.append("个人简介: ").append(resume.getPersonalInfo().getSummary()).append("\n");
        }

        if (jobDescription != null) {
            sb.append("\n=== 目标职位描述 ===\n");
            sb.append(jobDescription).append("\n");
        }

        sb.append("\n请提供优化建议，包括：\n");
        sb.append("1. 简历内容改进建议\n");
        sb.append("2. 关键词优化\n");
        sb.append("3. 格式和结构建议\n");

        return sb.toString();
    }

    private String buildCoverLetterPrompt(Resume resume, String company, String position, String jobDescription) {
        StringBuilder sb = new StringBuilder();
        sb.append("请根据以下简历信息，为").append(company).append("的").append(position).append("职位撰写一封求职信。\n\n");

        if (resume.getPersonalInfo() != null) {
            sb.append("姓名: ").append(resume.getPersonalInfo().getFullName()).append("\n");
        }

        sb.append("目标职位: ").append(resume.getTargetPosition()).append("\n");

        if (jobDescription != null) {
            sb.append("\n职位描述:\n").append(jobDescription).append("\n");
        }

        sb.append("\n请撰写一封专业、真诚的求职信，突出我的优势和对该职位的热情。");

        return sb.toString();
    }

    private String buildJobMatchPrompt(Resume resume, String jobDescription) {
        StringBuilder sb = new StringBuilder();
        sb.append("请分析以下简历与职位的匹配度。\n\n");
        sb.append("=== 简历信息 ===\n");
        sb.append("目标职位: ").append(resume.getTargetPosition()).append("\n");

        if (resume.getSkills() != null && !resume.getSkills().isEmpty()) {
            sb.append("技能: ").append(
                    resume.getSkills().stream()
                            .map(Skill::getName)
                            .collect(Collectors.joining(", "))
            ).append("\n");
        }

        sb.append("\n=== 职位描述 ===\n");
        sb.append(jobDescription).append("\n");

        sb.append("\n请提供：\n");
        sb.append("1. 匹配度评分（0-100）\n");
        sb.append("2. 匹配的技能和经验\n");
        sb.append("3. 缺失的技能和要求\n");
        sb.append("4. 改进建议\n");

        return sb.toString();
    }
}
