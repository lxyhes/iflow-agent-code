/**
 * ResumeManager - 简历管理主组件
 * 
 * 提供简历的创建、编辑、预览和AI优化功能
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Edit3, Trash2, Sparkles, 
  Briefcase, Target, ChevronRight, Loader2, X,
  Award, BookOpen, Code2, FolderOpen, User,
  ArrowLeft, BarChart3
} from 'lucide-react';
import { resumeApi } from '../../services/resumeApi';
import ResumeEditor from './ResumeEditor';
import ResumePreview from './ResumePreview';
import ResumeOptimizer from './ResumeOptimizer';
import ResumeMatcher from './ResumeMatcher';
import ResumeScorePanel from './ResumeScorePanel';

const ResumeManager = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState('list'); // list, edit, preview, optimize, match
  const [error, setError] = useState(null);

  // 加载简历列表
  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const response = await resumeApi.getResumes();
      if (response.success) {
        setResumes(response.data);
      }
    } catch (err) {
      setError('加载简历列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResume = async (data) => {
    console.log('Creating resume with data:', data);
    try {
      const response = await resumeApi.createResume(data);
      console.log('Create resume response:', response);
      if (response.success) {
        setResumes([response.data, ...resumes]);
        setShowCreateModal(false);
        handleEditResume(response.data.id);
      } else {
        setError('创建简历失败: ' + (response.error || '未知错误'));
      }
    } catch (err) {
      console.error('Create resume error:', err);
      setError('创建简历失败: ' + (err.message || '网络错误'));
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (!window.confirm('确定要删除这份简历吗？')) return;
    
    try {
      const response = await resumeApi.deleteResume(resumeId);
      if (response.success) {
        setResumes(resumes.filter(r => r.id !== resumeId));
        if (selectedResume?.id === resumeId) {
          setSelectedResume(null);
          setView('list');
        }
      }
    } catch (err) {
      setError('删除简历失败');
      console.error(err);
    }
  };

  const handleEditResume = async (resumeId) => {
    try {
      const response = await resumeApi.getResume(resumeId);
      if (response.success) {
        setSelectedResume(response.data);
        setView('edit');
      }
    } catch (err) {
      setError('加载简历详情失败');
      console.error(err);
    }
  };

  const handlePreviewResume = async (resumeId) => {
    try {
      const response = await resumeApi.getResume(resumeId);
      if (response.success) {
        setSelectedResume(response.data);
        setView('preview');
      }
    } catch (err) {
      setError('加载简历详情失败');
      console.error(err);
    }
  };

  const handleOptimizeResume = async (resumeId) => {
    try {
      const response = await resumeApi.getResume(resumeId);
      if (response.success) {
        setSelectedResume(response.data);
        setView('optimize');
      }
    } catch (err) {
      setError('加载简历详情失败');
      console.error(err);
    }
  };

  const handleMatchJob = async (resumeId) => {
    try {
      const response = await resumeApi.getResume(resumeId);
      if (response.success) {
        setSelectedResume(response.data);
        setView('match');
      }
    } catch (err) {
      setError('加载简历详情失败');
      console.error(err);
    }
  };

  const handleViewScore = async (resumeId) => {
    try {
      const response = await resumeApi.getResume(resumeId);
      if (response.success) {
        setSelectedResume(response.data);
        setView('score');
      }
    } catch (err) {
      setError('加载简历详情失败');
      console.error(err);
    }
  };

  const getCompletionPercentage = (resume) => {
    let score = 0;
    let total = 5;
    
    if (resume.personal_info?.full_name) score++;
    if (resume.work_experience?.length > 0) score++;
    if (resume.education?.length > 0) score++;
    if (resume.skills?.length > 0) score++;
    if (resume.projects?.length > 0) score++;
    
    return Math.round((score / total) * 100);
  };

  if (view === 'edit' && selectedResume) {
    return (
      <div className="h-full">
        <ResumeEditor
          resume={selectedResume}
          onBack={() => setView('list')}
          onUpdate={(updated) => {
            setSelectedResume(updated);
            loadResumes();
          }}
        />
      </div>
    );
  }

  if (view === 'preview' && selectedResume) {
    return (
      <ResumePreview 
        resume={selectedResume}
        onBack={() => setView('list')}
        onEdit={() => setView('edit')}
      />
    );
  }

  if (view === 'optimize' && selectedResume) {
    return (
      <ResumeOptimizer 
        resume={selectedResume}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'match' && selectedResume) {
    return (
      <ResumeMatcher
        resume={selectedResume}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'score' && selectedResume) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('list')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                简历诊断报告
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedResume.name}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <ResumeScorePanel
              resume={selectedResume}
              onResumeUpdate={async (updatedResume) => {
                // 保存更新后的简历
                try {
                  const response = await resumeApi.updateResume(selectedResume.id, updatedResume);
                  if (response.success) {
                    setSelectedResume(response.data);
                    loadResumes();
                    alert('简历已优化并保存！');
                  }
                } catch (err) {
                  console.error('保存简历失败:', err);
                  alert('保存失败，请重试');
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              简历管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              创建、管理和优化您的职业简历
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建简历
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              还没有简历
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              创建您的第一份简历，开启职业发展新篇章
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              创建简历
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => {
              const completion = getCompletionPercentage(resume);
              return (
                <div
                  key={resume.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {resume.name}
                        </h3>
                        {resume.target_position && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            目标：{resume.target_position}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditResume(resume.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 完成度进度条 */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">完成度</span>
                        <span className={`font-medium ${
                          completion >= 80 ? 'text-green-600' : 
                          completion >= 50 ? 'text-yellow-600' : 'text-orange-600'
                        }`}>
                          {completion}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            completion >= 80 ? 'bg-green-500' : 
                            completion >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>

                    {/* 统计信息 */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <User className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {resume.personal_info?.full_name ? '有' : '无'}
                        </span>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Briefcase className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {resume.work_experience?.length || 0} 段
                        </span>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <BookOpen className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {resume.education?.length || 0} 段
                        </span>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Code2 className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {resume.skills?.length || 0} 项
                        </span>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handlePreviewResume(resume.id)}
                        className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        预览简历
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOptimizeResume(resume.id)}
                          className="py-2 px-4 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          AI优化
                        </button>
                        <button
                          onClick={() => handleMatchJob(resume.id)}
                          className="py-2 px-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Target className="w-4 h-4" />
                          职位匹配
                        </button>
                      </div>
                      <button
                        onClick={() => handleViewScore(resume.id)}
                        className="w-full py-2 px-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        查看评分
                      </button>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      最后更新：{new Date(resume.updated_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 创建简历模态框 */}
      {showCreateModal && (
        <CreateResumeModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateResume}
        />
      )}
    </div>
  );
};

// 创建简历模态框组件
const CreateResumeModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    target_position: '',
    template: 'modern'
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await resumeApi.getTemplates();
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (err) {
      console.error('加载模板失败:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('请输入简历名称');
      return;
    }
    setLoading(true);
    console.log('Submitting form:', formData);
    try {
      await onCreate(formData);
    } catch (err) {
      console.error('Submit error:', err);
      alert('创建失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">新建简历</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              简历名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：Java后端开发简历"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目标职位
            </label>
            <input
              type="text"
              value={formData.target_position}
              onChange={(e) => setFormData({ ...formData, target_position: e.target.value })}
              placeholder="例如：高级Java工程师"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择模板
            </label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, template: template.id })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    formData.template === template.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {template.id === 'modern' && '📄'}
                    {template.id === 'professional' && '💼'}
                    {template.id === 'creative' && '🎨'}
                    {template.id === 'technical' && '💻'}
                    {template.id === 'minimal' && '📝'}
                    {template.id === 'elegant' && '✨'}
                  </div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResumeManager;
