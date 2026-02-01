// 面试 AI 服务
// 调用后端 AI 接口提供面试辅助功能

import { authenticatedFetch } from '../utils/api';

const API_BASE = '/api/interview-ai';

class InterviewAIService {
  constructor() {
    this.cache = new Map();
  }

  // 面试高手模式 - 生成高分回答
  async generateMasterAnswer(company, position, question, questionType = 'technical') {
    const cacheKey = `master-${company}-${position}-${question}`;
    
    try {
      const response = await authenticatedFetch(`${API_BASE}/master-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company,
          position,
          question,
          question_type: questionType,
        }),
      });

      if (!response.ok) {
        throw new Error('生成回答失败');
      }

      const result = await response.json();
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('面试高手模式失败:', error);
      throw error;
    }
  }

  // STAR 法则训练 - 分析故事
  async analyzeSTARStory(story, context = null) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/star-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('STAR 分析失败');
      }

      return await response.json();
    } catch (error) {
      console.error('STAR 分析失败:', error);
      throw error;
    }
  }

  // 薪资谈判模拟 - 生成谈判策略
  async generateSalaryStrategy(company, position, targetSalary, experienceYears, currentSalary = null) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/salary-negotiation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company,
          position,
          target_salary: targetSalary,
          experience_years: experienceYears,
          current_salary: currentSalary,
        }),
      });

      if (!response.ok) {
        throw new Error('生成谈判策略失败');
      }

      return await response.json();
    } catch (error) {
      console.error('薪资谈判策略失败:', error);
      throw error;
    }
  }

  // 深度追问 - 生成追问问题
  async generateDeepDive(question, answer, depth = 1) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/deep-dive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          answer,
          depth,
        }),
      });

      if (!response.ok) {
        throw new Error('生成追问问题失败');
      }

      return await response.json();
    } catch (error) {
      console.error('深度追问失败:', error);
      throw error;
    }
  }

  // 压力面试 - 生成压力回应
  async generatePressureResponse(candidateAnswer, pressureType = 'challenge') {
    try {
      const response = await authenticatedFetch(`${API_BASE}/pressure-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_answer: candidateAnswer,
          pressure_type: pressureType,
        }),
      });

      if (!response.ok) {
        throw new Error('生成压力回应失败');
      }

      return await response.json();
    } catch (error) {
      console.error('压力面试失败:', error);
      throw error;
    }
  }

  // 面试复盘 - 生成复盘报告
  async generateInterviewReview(questions, answers, company, position) {
    try {
      const response = await authenticatedFetch(`${API_BASE}/interview-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions,
          answers,
          company,
          position,
        }),
      });

      if (!response.ok) {
        throw new Error('生成复盘报告失败');
      }

      return await response.json();
    } catch (error) {
      console.error('面试复盘失败:', error);
      throw error;
    }
  }

  // 获取服务状态
  async getStatus() {
    try {
      const response = await authenticatedFetch(`${API_BASE}/status`);
      if (!response.ok) {
        throw new Error('获取状态失败');
      }
      return await response.json();
    } catch (error) {
      console.error('获取状态失败:', error);
      throw error;
    }
  }

  // 清空缓存
  clearCache() {
    this.cache.clear();
  }
}

// 创建单例
const interviewAIService = new InterviewAIService();

export default interviewAIService;
export { InterviewAIService };
