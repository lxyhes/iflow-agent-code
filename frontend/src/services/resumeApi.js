/**
 * 简历服务 API
 * 
 * 提供简历相关的所有 API 调用
 */

import { authenticatedFetch } from '../utils/api';

const API_BASE = '/api/resumes';

export const resumeApi = {
  // 简历 CRUD
  getResumes: async () => {
    const response = await authenticatedFetch(`${API_BASE}/`);
    return response.json();
  },

  getResume: async (resumeId) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}`);
    return response.json();
  },

  createResume: async (data) => {
    const response = await authenticatedFetch(`${API_BASE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateResume: async (resumeId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteResume: async (resumeId) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 个人信息
  updatePersonalInfo: async (resumeId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/personal-info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 工作经历
  addWorkExperience: async (resumeId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/work-experience`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateWorkExperience: async (resumeId, expId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/work-experience/${expId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteWorkExperience: async (resumeId, expId) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/work-experience/${expId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 教育经历
  addEducation: async (resumeId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/education`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateEducation: async (resumeId, eduId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/education/${eduId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteEducation: async (resumeId, eduId) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/education/${eduId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 技能
  addSkill: async (resumeId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateSkill: async (resumeId, skillId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/skills/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteSkill: async (resumeId, skillId) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/skills/${skillId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 项目经历
  addProject: async (resumeId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateProject: async (resumeId, projectId, data) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteProject: async (resumeId, projectId) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/projects/${projectId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // AI 功能
  optimizeResume: async (resumeId, jobDescription = null) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription }),
    });
    return response.json();
  },

  matchJob: async (resumeId, jobDescription) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/match-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription }),
    });
    return response.json();
  },

  generateCoverLetter: async (resumeId, company, position, jobDescription = null) => {
    const response = await authenticatedFetch(`${API_BASE}/${resumeId}/generate-cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, position, job_description: jobDescription }),
    });
    return response.json();
  },

  // 模板
  getTemplates: async () => {
    const response = await authenticatedFetch(`${API_BASE}/templates/list`);
    return response.json();
  },
};
