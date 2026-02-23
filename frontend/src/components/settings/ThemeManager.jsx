import React, { useState, useEffect } from 'react';
import { Palette, Save, Download, Upload, X, Plus, Trash2, Loader } from 'lucide-react';

/**
 * 主题管理组件
 */
const ThemeManager = () => {
  const [themes, setThemes] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/settings/themes');
      if (!response.ok) throw new Error('获取主题失败');
      const data = await response.json();
      setThemes(data.themes || getMockThemes());
    } catch (error) {
      console.error('获取主题失败:', error);
      setThemes(getMockThemes());
    } finally {
      setLoading(false);
    }
  };

  const getMockThemes = () => [
    { id: 1, name: '默认亮色', isBuiltIn: true, colors: { primary: '#3b82f6', background: '#ffffff', text: '#1f2937' } },
    { id: 2, name: '深色模式', isBuiltIn: true, colors: { primary: '#60a5fa', background: '#1f2937', text: '#f9fafb' } },
    { id: 3, name: '我的主题', isBuiltIn: false, colors: { primary: '#8b5cf6', background: '#fef3c7', text: '#1f2937' } },
  ];

  const handleApplyTheme = (theme) => {
    setCurrentTheme(theme);
    // 应用主题颜色
    document.documentElement.style.setProperty('--color-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--color-background', theme.colors.background);
    document.documentElement.style.setProperty('--color-text', theme.colors.text);
  };

  const handleExportTheme = (theme) => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTheme = async (id) => {
    if (!confirm('确定要删除此主题吗？')) return;
    try {
      await fetch(`/api/settings/themes/${id}`, { method: 'DELETE' });
      setThemes(themes.filter(t => t.id !== id));
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            主题管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            自定义界面主题和配色方案
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          创建主题
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map(theme => (
          <div
            key={theme.id}
            className={`bg-white dark:bg-gray-800 rounded-lg border-2 overflow-hidden transition-colors ${
              currentTheme?.id === theme.id
                ? 'border-blue-500'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* 主题预览 */}
            <div
              className="h-32 relative"
              style={{ backgroundColor: theme.colors.background }}
            >
              <div
                className="absolute top-4 left-4 right-4 h-8 rounded"
                style={{ backgroundColor: theme.colors.primary, opacity: 0.3 }}
              />
              <div
                className="absolute bottom-4 left-4 right-4 h-4 rounded"
                style={{ backgroundColor: theme.colors.text, opacity: 0.5 }}
              />
            </div>

            {/* 主题信息 */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {theme.name}
                </h3>
                {theme.isBuiltIn && (
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    内置
                  </span>
                )}
              </div>

              {/* 配色展示 */}
              <div className="flex gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded border border-gray-200"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="主色"
                />
                <div
                  className="w-8 h-8 rounded border border-gray-200"
                  style={{ backgroundColor: theme.colors.background }}
                  title="背景色"
                />
                <div
                  className="w-8 h-8 rounded border border-gray-200"
                  style={{ backgroundColor: theme.colors.text }}
                  title="文字色"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApplyTheme(theme)}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  应用
                </button>
                <button
                  onClick={() => handleExportTheme(theme)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                </button>
                {!theme.isBuiltIn && (
                  <button
                    onClick={() => handleDeleteTheme(theme.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateThemeModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchThemes();
          }}
        />
      )}
    </div>
  );
};

/**
 * 创建主题模态框
 */
const CreateThemeModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    colors: {
      primary: '#3b82f6',
      background: '#ffffff',
      text: '#1f2937',
    },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/settings/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('创建失败');
      onCreated();
    } catch (error) {
      alert('创建失败：' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">创建主题</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">主题名称</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="例如：我的主题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">主色</label>
              <input
                type="color"
                value={formData.colors.primary}
                onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, primary: e.target.value } })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">背景色</label>
              <input
                type="color"
                value={formData.colors.background}
                onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, background: e.target.value } })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">文字色</label>
              <input
                type="color"
                value={formData.colors.text}
                onChange={(e) => setFormData({ ...formData, colors: { ...formData.colors, text: e.target.value } })}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              取消
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ThemeManager;
