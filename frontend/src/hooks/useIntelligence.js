/**
 * useIntelligence Hook
 * 智能分析功能 Hook - 让组件轻松使用 AI/智能服务
 * 
 * 使用方法:
 *   const { analyzeFile, fixFile, isAnalyzing } = useIntelligence();
 *   
 *   // 分析文件
 *   const result = await analyzeFile('myproject', 'src/app.js');
 *   
 *   // 自动修复
 *   await fixFile('myproject', 'src/app.js');
 */

import { useState, useCallback, useRef } from 'react';
import { intelligenceService } from '../services/intelligenceService';

/**
 * 智能分析 Hook
 * @returns {Object} 智能分析功能和状态
 */
export function useIntelligence() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * 分析文件
   */
  const analyzeFile = useCallback(async (project, filePath) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.analyzeFile(project, filePath);
      if (!result.success) {
        setError(result.error || '分析失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 分析整个项目
   */
  const analyzeProject = useCallback(async (project) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.analyzeProject(project);
      if (!result.success) {
        setError(result.error || '分析失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 批量分析（快速扫描）
   */
  const batchAnalyze = useCallback(async (project) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.batchAnalyze(project);
      if (!result.success) {
        setError(result.error || '批量分析失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 自动修复文件
   */
  const fixFile = useCallback(async (project, filePath, issueType = null) => {
    setIsFixing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.fixFile(project, filePath, issueType);
      if (!result.success) {
        setError(result.error || '修复失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsFixing(false);
    }
  }, []);

  /**
   * 分析错误日志
   */
  const analyzeErrors = useCallback(async (project, errorLog) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.analyzeErrors(project, errorLog);
      if (!result.success) {
        setError(result.error || '错误分析失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 代码补全
   */
  const completeCode = useCallback(async (project, filePath, cursorPosition, context = null) => {
    try {
      return await intelligenceService.completeCode(project, filePath, cursorPosition, context);
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * 生成单元测试
   */
  const generateTests = useCallback(async (project, filePath) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.generateTests(project, filePath);
      if (!result.success) {
        setError(result.error || '测试生成失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 建议重构
   */
  const suggestRefactoring = useCallback(async (project, filePath) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await intelligenceService.suggestRefactoring(project, filePath);
      if (!result.success) {
        setError(result.error || '重构建议失败');
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * 快速检查文件
   */
  const quickCheck = useCallback(async (project, filePath) => {
    try {
      return await intelligenceService.quickCheck(project, filePath);
    } catch (err) {
      return [];
    }
  }, []);

  /**
   * 获取项目问题概览
   */
  const getProjectOverview = useCallback(async (project) => {
    try {
      return await intelligenceService.getProjectOverview(project);
    } catch (err) {
      return {
        totalFiles: 0,
        filesWithIssues: 0,
        topIssues: [],
        error: err.message
      };
    }
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状态
    isAnalyzing,
    isFixing,
    error,
    
    // 方法
    analyzeFile,
    analyzeProject,
    batchAnalyze,
    fixFile,
    analyzeErrors,
    completeCode,
    generateTests,
    suggestRefactoring,
    quickCheck,
    getProjectOverview,
    clearError,
  };
}

export default useIntelligence;
