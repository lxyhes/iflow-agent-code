package com.iflow.agent.service.resume;

import com.iflow.agent.entity.Resume;
import com.iflow.agent.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;

    public List<Resume> getResumesByUserId(String userId) {
        return resumeRepository.findByUserId(userId);
    }

    public Optional<Resume> getResumeById(Long id, String userId) {
        return resumeRepository.findByIdAndUserId(id, userId);
    }

    @Transactional
    public Resume createResume(Resume resume) {
        log.info("Creating resume for user: {}", resume.getUserId());
        return resumeRepository.save(resume);
    }

    @Transactional
    public Resume updateResume(Long id, String userId, Resume updatedResume) {
        Optional<Resume> existing = resumeRepository.findByIdAndUserId(id, userId);
        if (existing.isEmpty()) {
            throw new IllegalArgumentException("Resume not found");
        }

        Resume resume = existing.get();
        resume.setName(updatedResume.getName());
        resume.setEmail(updatedResume.getEmail());
        resume.setPhone(updatedResume.getPhone());
        resume.setTitle(updatedResume.getTitle());
        resume.setSummary(updatedResume.getSummary());
        resume.setSkills(updatedResume.getSkills());
        resume.setExperience(updatedResume.getExperience());
        resume.setEducation(updatedResume.getEducation());
        resume.setProjects(updatedResume.getProjects());
        resume.setRawContent(updatedResume.getRawContent());

        log.info("Updating resume {} for user: {}", id, userId);
        return resumeRepository.save(resume);
    }

    @Transactional
    public void deleteResume(Long id, String userId) {
        log.info("Deleting resume {} for user: {}", id, userId);
        resumeRepository.deleteByIdAndUserId(id, userId);
    }
}
