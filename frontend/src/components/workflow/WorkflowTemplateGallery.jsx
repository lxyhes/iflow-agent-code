import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download,
  Play,
  FileText,
  Code,
  BarChart3,
  CheckCircle,
  Loader
} from 'lucide-react';

/**
 * 工作流模板库组件
 */
const WorkflowTemplateGallery = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = [
    { id: 'all', label: '全部', icon: FileText },
    { id: 'code-review', label: '代码审查', icon: Code },
    { id: 'testing', label: '测试', icon: CheckCircle },
    { id: 'documentation', label: '文档', icon: FileText },
    { id: 'data-analysis', label: '数据分析', icon: BarChart3 },
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/workflow/templates');
      if (!response.ok) throw new Error('获取模板失败');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('获取模板失败:', error);
      // 使用模拟数据
      setTemplates(getMockTemplates());
    } finally {
      setLoading(false);
    }
  };

  const getMockTemplates = () => [
    {
      id: 1,
      name: '代码审查工作流',
      description: '自动化代码审查流程，从获取 PR 到生成审查报告',
      category: 'code-review',
      usageCount: 128,
      createdAt: '2026-02-20',
    },
    {
      id: 2,
      name: '文档生成工作流',
      description: '从代码自动生成 API 文档',
      category: 'documentation',
      usageCount: 95,
      createdAt: '2026-02-19',
    },
    {
      id: 3,
      name: '自动化测试工作流',
      description: '运行测试并生成报告',
      category: 'testing',
      usageCount: 87,
      createdAt: '2026-02-18',
    },
    {
      id: 4,
      name: '数据分析工作流',
      description: '自动化数据处理和分析流程',
      category: 'data-analysis',
      usageCount: 64,
      createdAt: '2026-02-17',
    },
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template) => {
    // 使用模板创建工作流
    console.log('使用模板:', template);
    // 可以导航到工作流编辑器并加载模板
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('确定要删除此模板吗？')) return;
    
    try {
      const response = await fetch(`/api/workflow/templates/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('删除失败');
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  };

  const handleExportTemplate = (template) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            工作流模板库
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            使用预设模板快速创建工作流
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          创建模板
        </button>
      </div>

      {/* 搜索和分类 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索模板..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无模板</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
            >
              {/* 模板头部 */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  template.category === 'code-review' ? 'bg-blue-100 dark:bg-blue-900' :
                  template.category === 'testing' ? 'bg-green-100 dark:bg-green-900' :
                  template.category === 'documentation' ? 'bg-purple-100 dark:bg-purple-900' :
                  'bg-orange-100 dark:bg-orange-900'
                }`}>
                  {template.category === 'code-review' ? <Code className="w-5 h-5 text-blue-600" /> :
                   template.category === 'testing' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                   template.category === 'documentation' ? <FileText className="w-5 h-5 text-purple-600" /> :
                   <BarChart3 className="w-5 h-5 text-orange-600" />}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleExportTemplate(template)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 模板信息 */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {template.description}
              </p>

              {/* 使用统计 */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>使用 {template.usageCount} 次</span>
                <span>{new Date(template.createdAt).toLocaleDateString()}</span>
              </div>

              {/* 操作按钮 */}
              <button
                onClick={() => handleUseTemplate(template)}
                className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                使用此模板
              </button>
            </div>
          ))
        )}
      </div>

      {/* 创建模板模态框 */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
};

/**
 * 创建模板模态框
 */
const CreateTemplateModal = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'code-review',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/workflow/templates', {
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
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          创建模板
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                模板名称
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="例如：代码审查工作流"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                描述
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="描述模板的用途..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                分类
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="code-review">代码审查</option>
                <option value="testing">测试</option>
                <option value="documentation">文档</option>
                <option value="data-analysis">数据分析</option>
                <option value="automation">自动化</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowTemplateGallery;
