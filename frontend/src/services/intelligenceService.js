/**
 * Intelligence Service
 * 智能分析服务 - 统一调用后端 AI/智能相关 API
 * 
 * 使用方法:
 *   import { intelligenceService } from '../services/intelligenceService';
 *   
 *   // 分析文件
 *   const result = await intelligenceService.analyzeFile('myproject', 'src/app.js');
 *   
 *   // 批量分析项目
 *   const batchResult = await intelligenceService.batchAnalyze('myproject');
 */

import { api } from '../utils/api';

const BASE_URL = '/api/intelligence';

/**
 * 智能分析服务类
 */
class IntelligenceService {
  
  // ============================================
  // 代码分析
  // ============================================
  
  /**
   * 分析单个文件
   * @param {string} project - 项目名称
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeFile(project, filePath) {
    try {
      const response = await api.post(`${BASE_URL}/analyze-file`, {
        project,
        file_path: filePath
      });
      return response;
    } catch (error) {
      console.error('Failed to analyze file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 分析整个项目
   * @param {string} project - 项目名称
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeProject(project) {
    try {
      const response = await api.post(`${BASE_URL}/analyze-project`, {
        project
      });
      return response;
    } catch (error) {
      console.error('Failed to analyze project:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 批量分析（快速扫描）
   * @param {string} project - 项目名称
   * @returns {Promise<Object>} 批量分析结果
   */
  async batchAnalyze(project) {
    try {
      const response = await api.post(`${BASE_URL}/batch-analyze`, {
        project
      });
      return response;
    } catch (error) {
      console.error('Failed to batch analyze:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ============================================
  // 自动修复
  // ============================================
  
  /**
   * 自动修复文件
   * @param {string} project - 项目名称
   * @param {string} filePath - 文件路径
   * @param {string} issueType - 问题类型（可选）
   * @returns {Promise<Object>} 修复结果
   */
  async fixFile(project, filePath, issueType = null) {
    try {
      const response = await api.post(`${BASE_URL}/fix-file`, {
        project,
        file_path: filePath,
        issue_type: issueType
      });
      return response;
    } catch (error) {
      console.error('Failed to fix file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 分析错误日志
   * @param {string} project - 项目名称
   * @param {string} errorLog - 错误日志内容
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeErrors(project, errorLog) {
    try {
      const response = await api.post(`${BASE_URL}/analyze-errors`, {
        project,
        error_log: errorLog
      });
      return response;
    } catch (error) {
      console.error('Failed to analyze errors:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ============================================
  // 智能代码功能
  // ============================================
  
  /**
   * 代码补全
   * @param {string} project - 项目名称
   * @param {string} filePath - 文件路径
   * @param {number} cursorPosition - 光标位置
   * @param {string} context - 上下文（可选）
   * @returns {Promise<Object>} 补全建议
   */
  async completeCode(project, filePath, cursorPosition, context = null) {
    try {
      const response = await api.post(`${BASE_URL}/complete-code`, {
        project,
        file_path: filePath,
        cursor_position: cursorPosition,
        context
      });
      return response;
    } catch (error) {
      console.error('Failed to complete code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 生成单元测试
   * @param {string} project - 项目名称
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 测试代码
   */
  async generateTests(project, filePath) {
    try {
      const response = await api.post(`${BASE_URL}/generate-tests`, {
        project,
        file_path: filePath
      });
      return response;
    } catch (error) {
      console.error('Failed to generate tests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 建议重构
   * @param {string} project - 项目名称
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 重构建议
   */
  async suggestRefactoring(project, filePath) {
    try {
      const response = await api.post(`${BASE_URL}/suggest-refactoring`, {
        project,
        file_path: filePath
      });
      return response;
    } catch (error) {
      console.error('Failed to suggest refactoring:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ============================================
  // 便捷方法
  // ============================================
  
  /**
   * 快速检查文件问题
   * @param {string} project - 项目名称
   * @param {string} filePath - 文件路径
   * @returns {Promise<Array>} 问题列表
   */
  async quickCheck(project, filePath) {
    const result = await this.analyzeFile(project, filePath);
    if (result.success) {
      return result.suggestions || [];
    }
    return [];
  }
  
  /**
   * 获取项目问题概览
   * @param {string} project - 项目名称
   * @returns {Promise<Object>} 问题概览
   */
  async getProjectOverview(project) {
    const result = await this.batchAnalyze(project);
    if (result.success) {
      return {
        totalFiles: result.summary?.total_files || 0,
        filesWithIssues: result.summary?.files_with_issues || 0,
        topIssues: result.files_with_issues || []
      };
    }
    return {
      totalFiles: 0,
      filesWithIssues: 0,
      topIssues: [],
      error: result.error
    };
  }
}

// 导出单例实例
export const intelligenceService = new IntelligenceService();

// 默认导出
export default intelligenceService;
