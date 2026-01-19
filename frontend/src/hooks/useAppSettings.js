import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * 应用设置 Hook
 *
 * 管理应用级别的设置，如专注模式、AI Persona 等
 */
export const useAppSettings = () => {
  // 专注模式
  const [isFocusMode, setIsFocusMode] = useLocalStorage('focusMode', false);

  // AI Persona
  const [aiPersona, setAIPersona] = useLocalStorage('aiPersona', 'partner');

  /**
   * 切换专注模式
   */
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => !prev);
  }, []);

  /**
   * 设置专注模式
   */
  const setFocusMode = useCallback((enabled) => {
    setIsFocusMode(enabled);
  }, []);

  /**
   * 设置 AI Persona
   */
  const setAIPersona = useCallback((persona) => {
    setAIPersona(persona);
  }, []);

  /**
   * 获取 AI Persona 显示名称
   */
  const getPersonaDisplayName = useCallback((persona) => {
    const personaMap = {
      'senior': '资深架构师',
      'hacker': '黑客',
      'partner': '合作伙伴'
    };
    return personaMap[persona] || persona;
  }, []);

  /**
   * 获取 AI Persona 描述
   */
  const getPersonaDescription = useCallback((persona) => {
    const descriptionMap = {
      'senior': '强调代码质量和最佳实践，优先考虑可维护性和可扩展性',
      'hacker': '快速迭代，优先功能实现，最小化样板代码',
      'partner': '友好协作的结对编程风格，鼓励和支持用户'
    };
    return descriptionMap[persona] || '';
  }, []);

  return {
    // 状态
    isFocusMode,
    aiPersona,

    // 设置器
    setIsFocusMode,
    setAIPersona,

    // 方法
    toggleFocusMode,
    setFocusMode,
    getPersonaDisplayName,
    getPersonaDescription,
  };
};