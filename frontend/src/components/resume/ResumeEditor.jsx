/**
 * ResumeEditor - 简历编辑器组件（增强版）
 * 
 * 提供完整的简历信息编辑功能，包含：
 * - 简历完整性评分
 * - 工作经历拖拽排序
 * - 技能关键词推荐
 * - 简历预览功能
 * - 批量导入导出
 * - 自动保存草稿
 * - 简历版本历史
 * - AI智能描述生成器
 * - 简历诊断报告
 * - 行动词推荐库
 * - 简历健康度仪表盘
 * - 一键AI优化
 * - 智能排版检查
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, User, Briefcase, BookOpen, Code2, 
  FolderOpen, Save, Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp, Loader2, Check, X,
  Clock, History, Eye, FileText, Sparkles,
  Stethoscope, Zap, Activity, Wand2, Layout,
  Camera, Target
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import ResumeCompletionScore from './ResumeCompletionScore';
import SkillRecommendations from './SkillRecommendations';
import ResumePreview from './ResumePreview';
import ResumeImportExport from './ResumeImportExport';
import AIDescriptionGenerator from './AIDescriptionGenerator';
import ResumeDiagnosticReport from './ResumeDiagnosticReport';
import ActionVerbsLibrary from './ActionVerbsLibrary';
import ResumeHealthDashboard from './ResumeHealthDashboard';
import AIOptimization from './AIOptimization';
import FormattingChecker from './FormattingChecker';
import KeyboardShortcuts from './KeyboardShortcuts';
import SplitScreenEditor from './SplitScreenEditor';
import SkillRadarChart from './SkillRadarChart';
import ExperienceTimeline from './ExperienceTimeline';

// 自动保存间隔（毫秒）
const AUTO_SAVE_INTERVAL = 30000;

const ResumeEditor = ({ resume, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [localResume, setLocalResume] = useState(resume);
  const [lastSaved, setLastSaved] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [targetPosition, setTargetPosition] = useState(resume.target_position || '');
  
  // 第二阶段功能状态
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);

  // 第三阶段功能状态
  const [splitScreenActive, setSplitScreenActive] = useState(false);
  const [showSkillRadar, setShowSkillRadar] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  
  const autoSaveTimerRef = useRef(null);
  const isDirtyRef = useRef(false);

  // 标签页配置
  const tabs = [
    { id: 'personal', label: '个人信息', icon: User },
    { id: 'experience', label: '工作经历', icon: Briefcase },
    { id: 'education', label: '教育经历', icon: BookOpen },
    { id: 'skills', label: '技能特长', icon: Code2 },
    { id: 'projects', label: '项目经历', icon: FolderOpen },
  ];

  // 加载本地草稿
  useEffect(() => {
    const draftKey = `resume_draft_${resume.id}`;
    const draft = localStorage.getItem(draftKey);
    const draftTime = localStorage.getItem(`${draftKey}_time`);
    
    if (draft && draftTime) {
      const draftDate = new Date(draftTime);
      const resumeDate = new Date(resume.updated_at || resume.created_at);
      
      // 如果草稿比服务器数据新，询问是否恢复
      if (draftDate > resumeDate) {
        const shouldRestore = window.confirm(
          `检测到本地草稿（${draftDate.toLocaleString()}），是否恢复？\n点击"确定"恢复草稿，点击"取消"使用服务器数据。`
        );
        if (shouldRestore) {
          try {
            const parsedDraft = JSON.parse(draft);
            setLocalResume(parsedDraft);
            setLastSaved(draftDate);
          } catch (e) {
            console.error('恢复草稿失败:', e);
          }
        }
      }
    }
  }, [resume.id]);

  // 自动保存
  useEffect(() => {
    const doAutoSave = () => {
      if (isDirtyRef.current) {
        const draftKey = `resume_draft_${resume.id}`;
        localStorage.setItem(draftKey, JSON.stringify(localResume));
        localStorage.setItem(`${draftKey}_time`, new Date().toISOString());
        setLastSaved(new Date());
        isDirtyRef.current = false;
      }
    };

    autoSaveTimerRef.current = setInterval(doAutoSave, AUTO_SAVE_INTERVAL);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [resume.id, localResume]);

  // 监听数据变化
  useEffect(() => {
    isDirtyRef.current = true;
  }, [localResume]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // 保存当前版本到历史
      saveVersion();
      
      // 真正保存简历数据到服务器
      const response = await resumeApi.updateResume(resume.id, {
        name: localResume.name,
        target_position: localResume.target_position,
        template: localResume.template,
        personal_info: localResume.personal_info,
      });
      
      if (response.success) {
        setLocalResume(response.data);
        onUpdate(response.data);
        setSaveSuccess(true);
        setLastSaved(new Date());
        
        // 清除草稿
        const draftKey = `resume_draft_${resume.id}`;
        localStorage.removeItem(draftKey);
        localStorage.removeItem(`${draftKey}_time`);
        
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setSaveError(response.error || '保存失败');
      }
    } catch (err) {
      console.error('保存失败:', err);
      setSaveError('保存失败，请检查网络连接');
    } finally {
      setSaving(false);
    }
  };

  // 保存版本历史
  const saveVersion = () => {
    const newVersion = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(localResume)),
      note: '手动保存'
    };
    
    const versionKey = `resume_versions_${resume.id}`;
    const existingVersions = JSON.parse(localStorage.getItem(versionKey) || '[]');
    const updatedVersions = [newVersion, ...existingVersions].slice(0, 20); // 保留最近20个版本
    localStorage.setItem(versionKey, JSON.stringify(updatedVersions));
    setVersions(updatedVersions);
  };

  // 加载版本历史
  const loadVersions = () => {
    const versionKey = `resume_versions_${resume.id}`;
    const savedVersions = JSON.parse(localStorage.getItem(versionKey) || '[]');
    setVersions(savedVersions);
    setShowVersions(true);
  };

  // 恢复到指定版本
  const restoreVersion = (version) => {
    if (window.confirm('确定要恢复到这个版本吗？当前未保存的更改将丢失。')) {
      setLocalResume(version.data);
      isDirtyRef.current = true;
      setShowVersions(false);
    }
  };

  // 处理导航到指定标签
  const handleNavigate = (tabId) => {
    if (tabs.find(t => t.id === tabId)) {
      setActiveTab(tabId);
    }
  };

  // 处理导入数据
  const handleImport = (importedData) => {
    setLocalResume(prev => ({
      ...prev,
      personal_info: importedData.personal_info || prev.personal_info,
      work_experience: importedData.work_experience || prev.work_experience,
      education: importedData.education || prev.education,
      skills: importedData.skills || prev.skills,
      projects: importedData.projects || prev.projects,
    }));
    isDirtyRef.current = true;
  };

  // 更新目标职位
  const handleUpdateTargetPosition = async (position) => {
    setTargetPosition(position);
    try {
      await resumeApi.updateResume(resume.id, { target_position: position });
      setLocalResume(prev => ({ ...prev, target_position: position }));
    } catch (err) {
      console.error('更新目标职位失败:', err);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoTab resume={localResume} onUpdate={setLocalResume} />;
      case 'experience':
        return <ExperienceTab resume={localResume} onUpdate={setLocalResume} />;
      case 'education':
        return <EducationTab resume={localResume} onUpdate={setLocalResume} />;
      case 'skills':
        return (
          <SkillsTab 
            resume={localResume} 
            onUpdate={setLocalResume}
            targetPosition={targetPosition}
            onUpdateTargetPosition={handleUpdateTargetPosition}
          />
        );
      case 'projects':
        return <ProjectsTab resume={localResume} onUpdate={setLocalResume} />;
      default:
        return null;
    }
  };

  if (showPreview) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              简历预览
            </h1>
          </div>
        </div>
        <div className="flex-1">
          <ResumePreview resume={localResume} />
        </div>
      </div>
    );
  }

  return (
    <KeyboardShortcuts
      onSave={handleSave}
      onUndo={() => {
        // 可以实现撤销功能
        console.log('撤销操作');
      }}
      onRedo={() => {
        // 可以实现重做功能
        console.log('重做操作');
      }}
      onPreview={() => setShowPreview(true)}
      onDiagnostic={() => setShowDiagnostic(true)}
      onTabChange={setActiveTab}
      currentTab={activeTab}
    >
    <SplitScreenEditor
      resume={localResume}
      isActive={splitScreenActive}
      onToggle={() => setSplitScreenActive(!splitScreenActive)}
    >
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                编辑简历
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {resume.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 第二阶段功能按钮组 */}
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => setShowDiagnostic(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                title="简历诊断"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                诊断
              </button>
              <button
                onClick={() => setShowHealthDashboard(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                title="健康度"
              >
                <Activity className="w-3.5 h-3.5" />
                健康度
              </button>
              <button
                onClick={() => setShowSkillRadar(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                title="技能雷达图"
              >
                <Target className="w-3.5 h-3.5" />
                技能图
              </button>
              <button
                onClick={() => setShowTimeline(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                title="职业时间轴"
              >
                <History className="w-3.5 h-3.5" />
                时间轴
              </button>
              <AIOptimization 
                resume={localResume} 
                onApply={(optimizations) => {
                  // 应用优化
                  let updatedResume = { ...localResume };
                  optimizations.forEach(opt => {
                    if (opt.type === 'summary' && opt.field === 'personal_info.summary') {
                      updatedResume.personal_info = {
                        ...updatedResume.personal_info,
                        summary: opt.optimized
                      };
                    }
                    // 可以添加更多字段的处理
                  });
                  setLocalResume(updatedResume);
                  isDirtyRef.current = true;
                }}
              />
              <FormattingChecker 
                resume={localResume}
                onApplyFixes={(fixes) => {
                  // 应用格式修复
                  let updatedResume = { ...localResume };
                  fixes.forEach(fix => {
                    if (fix.type === 'punctuation' && fix.location === '个人简介') {
                      updatedResume.personal_info = {
                        ...updatedResume.personal_info,
                        summary: fix.fixed
                      };
                    }
                    // 可以添加更多修复类型的处理
                  });
                  setLocalResume(updatedResume);
                  isDirtyRef.current = true;
                }}
              />
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

            {/* 版本历史按钮 */}
            <button
              onClick={loadVersions}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <History className="w-4 h-4" />
              历史版本
            </button>

            {/* 预览按钮 */}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              预览
            </button>

            {/* 导入导出 */}
            <ResumeImportExport resume={localResume} onImport={handleImport} />

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                saveSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? '保存中...' : saveSuccess ? '已保存' : '保存'}
            </button>
          </div>
        </div>

        {/* 自动保存状态 */}
        {lastSaved && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>上次保存: {lastSaved.toLocaleTimeString()}</span>
            {isDirtyRef.current && <span className="text-yellow-600">（有未保存更改）</span>}
          </div>
        )}

        {/* 保存错误提示 */}
        {saveError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* 完整性评分 */}
          <div className="mb-6">
            <ResumeCompletionScore 
              resume={localResume} 
              onNavigate={handleNavigate}
            />
          </div>

          {renderTabContent()}
        </div>
      </div>

      {/* 版本历史侧边栏 */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-96 bg-white dark:bg-gray-800 h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                版本历史
              </h2>
              <button
                onClick={() => setShowVersions(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无历史版本</p>
                  <p className="text-sm mt-1">保存简历后将自动创建版本</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, index) => (
                    <div
                      key={version.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          版本 {versions.length - index}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(version.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                        {version.note}
                      </p>
                      <button
                        onClick={() => restoreVersion(version)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        恢复此版本
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 简历诊断报告 */}
      {showDiagnostic && (
        <ResumeDiagnosticReport
          resume={localResume}
          onClose={() => setShowDiagnostic(false)}
          onOptimize={(result) => {
            // 应用优化结果到简历
            setLocalResume(prev => {
              const updated = { ...prev };
              if (result.personal_info?.summary) {
                updated.personal_info = {
                  ...prev.personal_info,
                  summary: result.personal_info.summary
                };
              }
              if (result.work_experience?.length > 0) {
                updated.work_experience = prev.work_experience?.map((exp) => {
                  const rewritten = result.work_experience.find(r => r.id === exp.id);
                  if (rewritten) {
                    return {
                      ...exp,
                      description: rewritten.description || exp.description,
                      achievements: rewritten.achievements || exp.achievements
                    };
                  }
                  return exp;
                });
              }
              return updated;
            });
            alert('简历已根据诊断优化！');
          }}
        />
      )}

      {/* 简历健康度仪表盘 */}
      {showHealthDashboard && (
        <ResumeHealthDashboard
          resume={localResume}
          onClose={() => setShowHealthDashboard(false)}
          onOptimize={(result) => {
            // 应用优化结果到简历
            setLocalResume(prev => {
              const updated = { ...prev };
              if (result.personal_info?.summary) {
                updated.personal_info = {
                  ...prev.personal_info,
                  summary: result.personal_info.summary
                };
              }
              if (result.work_experience?.length > 0) {
                updated.work_experience = prev.work_experience?.map((exp) => {
                  const rewritten = result.work_experience.find(r => r.id === exp.id);
                  if (rewritten) {
                    return {
                      ...exp,
                      description: rewritten.description || exp.description,
                      achievements: rewritten.achievements || exp.achievements
                    };
                  }
                  return exp;
                });
              }
              return updated;
            });
            alert('简历已根据健康分析优化！');
          }}
        />
      )}

      {/* 技能雷达图 */}
      {showSkillRadar && (
        <SkillRadarChart
          resume={localResume}
          onClose={() => setShowSkillRadar(false)}
          onUpdate={(updatedSkills) => {
            // 可以在这里更新简历的技能数据
            console.log('Updated skills:', updatedSkills);
          }}
        />
      )}

      {/* 职业时间轴 */}
      {showTimeline && (
        <ExperienceTimeline
          resume={localResume}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </div>
    </SplitScreenEditor>
    </KeyboardShortcuts>
  );
};

// 个人信息标签页
const PersonalInfoTab = ({ resume, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: resume.personal_info?.full_name || '',
    email: resume.personal_info?.email || '',
    phone: resume.personal_info?.phone || '',
    location: resume.personal_info?.location || '',
    summary: resume.personal_info?.summary || '',
    avatar: resume.personal_info?.avatar || '',
  });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const validateField = (field, value) => {
    let error = '';
    switch (field) {
      case 'full_name':
        if (!value || value.trim().length < 2) error = '姓名至少需要2个字符';
        break;
      case 'email':
        if (!value) {
          error = '邮箱不能为空';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = '邮箱格式不正确';
        }
        break;
      case 'phone':
        if (!value) {
          error = '电话不能为空';
        } else if (!/^1[3-9]\d{9}$/.test(value.replace(/[-\s]/g, ''))) {
          error = '手机号格式不正确';
        }
        break;
      default:
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    // 实时验证
    validateField(field, value);
  };

  const handleBlur = async () => {
    // 验证所有字段
    const isValid = ['full_name', 'email', 'phone'].every(field =>
      validateField(field, formData[field])
    );

    if (!isValid) return;

    try {
      await resumeApi.updatePersonalInfo(resume.id, formData);
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB');
      return;
    }

    setUploading(true);
    try {
      // 转换为 base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      // 压缩图片
      const compressedBase64 = await compressImage(base64, 400, 400, 0.8);

      setFormData(prev => ({ ...prev, avatar: compressedBase64 }));
      await resumeApi.updatePersonalInfo(resume.id, { ...formData, avatar: compressedBase64 });
      onUpdate({ ...resume, personal_info: { ...resume.personal_info, avatar: compressedBase64 } });
    } catch (err) {
      console.error('上传失败:', err);
      alert('头像上传失败');
    } finally {
      setUploading(false);
    }
  };

  const compressImage = (base64, maxWidth, maxHeight, quality) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">个人信息</h2>

      {/* 头像上传 */}
      <div className="flex items-center gap-6 mb-8">
        <div
          onClick={handleAvatarClick}
          className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
        >
          {formData.avatar ? (
            <img
              src={formData.avatar}
              alt="头像"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12 text-gray-400" />
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">头像</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            支持 JPG、PNG 格式，最大 2MB
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            建议尺寸 400x400 像素
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            onBlur={handleBlur}
            placeholder="您的姓名"
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={handleBlur}
            placeholder="your.email@example.com"
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            onBlur={handleBlur}
            placeholder="138-0000-0000"
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            所在地
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            onBlur={handleBlur}
            placeholder="北京、上海等"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            个人简介
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            onBlur={handleBlur}
            rows={4}
            placeholder="简要介绍您的专业背景、核心技能和职业目标..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            建议字数在100-200字之间
          </p>
        </div>
      </div>
    </div>
  );
};

// 工作经历标签页（带拖拽排序和AI描述生成）
const ExperienceTab = ({ resume, onUpdate }) => {
  const [experiences, setExperiences] = useState(resume.work_experience || []);
  const [editingId, setEditingId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  const handleAdd = async () => {
    try {
      const response = await resumeApi.addWorkExperience(resume.id, {
        company: '新公司',
        position: '职位名称',
        start_date: '',
        end_date: '',
        is_current: false,
        description: '',
        achievements: []
      });
      if (response.success) {
        setExperiences(response.data.work_experience);
        setEditingId(response.experience_id);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const response = await resumeApi.updateWorkExperience(resume.id, id, data);
      if (response.success) {
        setExperiences(response.data.work_experience);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这段工作经历吗？')) return;
    try {
      const response = await resumeApi.deleteWorkExperience(resume.id, id);
      if (response.success) {
        setExperiences(response.data.work_experience);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  // 拖拽处理
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newExperiences = [...experiences];
    const draggedExperience = newExperiences[draggedItem];
    newExperiences.splice(draggedItem, 1);
    newExperiences.splice(index, 0, draggedExperience);
    
    setExperiences(newExperiences);
    setDraggedItem(index);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDraggedItem(null);
    
    // 保存排序到服务器
    try {
      const order = experiences.map(exp => exp.id);
      const response = await resumeApi.updateWorkExperienceOrder(resume.id, order);
      if (response.success) {
        setExperiences(response.data.work_experience);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('保存排序失败:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">工作经历</h2>
        <div className="flex items-center gap-2">
          <AIDescriptionGenerator
            type="experience"
            onInsert={(text) => {
              // 找到正在编辑的经历，插入描述
              if (editingId) {
                const exp = experiences.find(e => e.id === editingId);
                if (exp) {
                  const newDesc = exp.description ? `${exp.description}\n${text}` : text;
                  handleUpdate(editingId, { ...exp, description: newDesc });
                }
              }
            }}
          />
          <ActionVerbsLibrary
            onSelect={(verb) => {
              // 复制到剪贴板或插入
              if (editingId) {
                const exp = experiences.find(e => e.id === editingId);
                if (exp) {
                  const newDesc = exp.description ? `${exp.description}${verb}` : verb;
                  handleUpdate(editingId, { ...exp, description: newDesc });
                }
              }
            }}
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加经历
          </button>
        </div>
      </div>

      {experiences.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">还没有工作经历</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">点击上方按钮添加您的第一段工作经历</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiences.map((exp, index) => (
            <div
              key={exp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
            >
              <ExperienceCard
                experience={exp}
                index={index}
                isEditing={editingId === exp.id}
                onEdit={() => setEditingId(exp.id)}
                onSave={(data) => {
                  handleUpdate(exp.id, data);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(exp.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 工作经历卡片组件
const ExperienceCard = ({ experience, index, isEditing, onEdit, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    company: experience.company || '',
    position: experience.position || '',
    start_date: experience.start_date || '',
    end_date: experience.end_date || '',
    is_current: experience.is_current || false,
    description: experience.description || '',
    achievements: experience.achievements || [],
    ...experience
  });

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              公司名称
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              职位
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              开始时间
            </label>
            <input
              type="month"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              结束时间
            </label>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={formData.is_current}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.is_current}
                  onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                  className="rounded"
                />
                在职
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              工作描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-move">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{experience.company}</h3>
              <span className="text-gray-500 dark:text-gray-400">·</span>
              <span className="text-gray-700 dark:text-gray-300">{experience.position}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {experience.start_date} - {experience.is_current ? '至今' : experience.end_date}
            </p>
            {experience.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{experience.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 教育经历标签页
const EducationTab = ({ resume, onUpdate }) => {
  const [education, setEducation] = useState(resume.education || []);

  const handleAdd = async () => {
    try {
      const response = await resumeApi.addEducation(resume.id, {
        school: '学校名称',
        degree: '学位',
        major: '专业',
        start_date: '',
        end_date: ''
      });
      if (response.success) {
        setEducation(response.data.education);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const response = await resumeApi.updateEducation(resume.id, id, data);
      if (response.success) {
        setEducation(response.data.education);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这段教育经历吗？')) return;
    try {
      const response = await resumeApi.deleteEducation(resume.id, id);
      if (response.success) {
        setEducation(response.data.education);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">教育经历</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加经历
        </button>
      </div>

      {education.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">还没有教育经历</p>
        </div>
      ) : (
        <div className="space-y-4">
          {education.map((edu) => (
            <EducationCard
              key={edu.id}
              education={edu}
              onUpdate={(data) => handleUpdate(edu.id, data)}
              onDelete={() => handleDelete(edu.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 教育经历卡片
const EducationCard = ({ education, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    school: education.school || '',
    major: education.major || '',
    degree: education.degree || '',
    start_date: education.start_date || '',
    end_date: education.end_date || '',
    ...education
  });

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              学校
            </label>
            <input
              type="text"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              专业
            </label>
            <input
              type="text"
              value={formData.major}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              学位
            </label>
            <select
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">请选择</option>
              <option value="高中">高中</option>
              <option value="大专">大专</option>
              <option value="本科">本科</option>
              <option value="硕士">硕士</option>
              <option value="博士">博士</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                开始时间
              </label>
              <input
                type="month"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                结束时间
              </label>
              <input
                type="month"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onUpdate(formData);
              setIsEditing(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{education.school}</h3>
          <p className="text-gray-700 dark:text-gray-300 mt-1">
            {education.degree} · {education.major}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {education.start_date} - {education.end_date}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 技能标签页（带推荐功能）
const SkillsTab = ({ resume, onUpdate, targetPosition, onUpdateTargetPosition }) => {
  const [skills, setSkills] = useState(resume.skills || []);
  const [newSkill, setNewSkill] = useState({ name: '', level: 3, category: '技术' });

  const handleAdd = async (skillData = null) => {
    const skillToAdd = skillData || newSkill;
    if (!skillToAdd.name.trim()) return;
    
    try {
      const response = await resumeApi.addSkill(resume.id, skillToAdd);
      if (response.success) {
        setSkills(response.data.skills);
        if (!skillData) {
          setNewSkill({ name: '', level: 3, category: '技术' });
        }
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const response = await resumeApi.updateSkill(resume.id, id, data);
      if (response.success) {
        setSkills(response.data.skills);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await resumeApi.deleteSkill(resume.id, id);
      if (response.success) {
        setSkills(response.data.skills);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const categories = [...new Set(skills.map(s => s.category))];

  return (
    <div className="space-y-4">
      {/* AI 技能推荐 */}
      <SkillRecommendations
        targetPosition={targetPosition}
        existingSkills={skills}
        onAddSkill={handleAdd}
        onUpdateTargetPosition={onUpdateTargetPosition}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">添加技能</h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={newSkill.name}
            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
            placeholder="技能名称"
            className="flex-1 min-w-[150px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select
            value={newSkill.category}
            onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
            className="px-4 py-2 h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="技术">技术</option>
            <option value="语言">语言</option>
            <option value="工具">工具</option>
            <option value="软技能">软技能</option>
            <option value="其他">其他</option>
          </select>
          <select
            value={newSkill.level}
            onChange={(e) => setNewSkill({ ...newSkill, level: parseInt(e.target.value) })}
            className="px-4 py-2 h-10 w-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>入门</option>
            <option value={2}>初级</option>
            <option value={3}>中级</option>
            <option value={4}>高级</option>
            <option value={5}>专家</option>
          </select>
          <button
            onClick={() => handleAdd()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {skills.filter(s => s.category === category).map((skill) => (
              <SkillTag
                key={skill.id}
                skill={skill}
                onUpdate={(data) => handleUpdate(skill.id, data)}
                onDelete={() => handleDelete(skill.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {skills.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Code2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">还没有添加技能</p>
        </div>
      )}
    </div>
  );
};

// 技能标签
const SkillTag = ({ skill, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(skill);

  const levelColors = {
    1: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    2: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    3: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    4: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    5: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const levelLabels = {
    1: '入门',
    2: '初级',
    3: '中级',
    4: '高级',
    5: '专家',
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{skill.name}</span>
        <select
          value={formData.level}
          onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
        >
          <option value={1}>入门</option>
          <option value={2}>初级</option>
          <option value={3}>中级</option>
          <option value={4}>高级</option>
          <option value={5}>专家</option>
        </select>
        <button
          onClick={() => {
            onUpdate(formData);
            setIsEditing(false);
          }}
          className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${levelColors[skill.level]} group cursor-pointer`}
      onClick={() => setIsEditing(true)}
    >
      <span>{skill.name}</span>
      <span className="text-xs opacity-75">({levelLabels[skill.level]})</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 rounded transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// 项目经历标签页
const ProjectsTab = ({ resume, onUpdate }) => {
  const [projects, setProjects] = useState(resume.projects || []);

  const handleAdd = async () => {
    try {
      const response = await resumeApi.addProject(resume.id, {
        name: '项目名称',
        description: '',
        technologies: [],
        role: '',
        achievements: [],
        start_date: '',
        end_date: ''
      });
      if (response.success) {
        setProjects(response.data.projects);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const response = await resumeApi.updateProject(resume.id, id, data);
      if (response.success) {
        setProjects(response.data.projects);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个项目吗？')) return;
    try {
      const response = await resumeApi.deleteProject(resume.id, id);
      if (response.success) {
        setProjects(response.data.projects);
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">项目经历</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">还没有项目经历</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">点击上方按钮添加您的第一个项目</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={(data) => handleUpdate(project.id, data)}
              onDelete={() => handleDelete(project.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 项目卡片
const ProjectCard = ({ project, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name || '',
    description: project.description || '',
    role: project.role || '',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    technologies: Array.isArray(project.technologies)
      ? project.technologies
      : (project.technologies ? JSON.parse(project.technologies) : []),
    achievements: Array.isArray(project.achievements)
      ? project.achievements
      : (project.achievements ? JSON.parse(project.achievements) : []),
    ...project
  });
  const [newTech, setNewTech] = useState('');

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              项目名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                开始时间
              </label>
              <input
                type="month"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                结束时间
              </label>
              <input
                type="month"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              角色
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="例如：项目负责人、核心开发者"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              项目描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              技术栈
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.technologies.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-2"
                >
                  {tech}
                  <button
                    onClick={() => setFormData({
                      ...formData,
                      technologies: formData.technologies.filter((_, i) => i !== index)
                    })}
                    className="hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                placeholder="添加技术"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newTech.trim()) {
                    setFormData({
                      ...formData,
                      technologies: [...formData.technologies, newTech.trim()]
                    });
                    setNewTech('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newTech.trim()) {
                    setFormData({
                      ...formData,
                      technologies: [...formData.technologies, newTech.trim()]
                    });
                    setNewTech('');
                  }
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                添加
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              onUpdate(formData);
              setIsEditing(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
          {project.role && (
            <p className="text-gray-700 dark:text-gray-300 mt-1">{project.role}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {project.start_date} - {project.end_date}
          </p>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-3">{project.description}</p>
          )}
          {Array.isArray(project.technologies) && project.technologies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {project.technologies.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeEditor;
