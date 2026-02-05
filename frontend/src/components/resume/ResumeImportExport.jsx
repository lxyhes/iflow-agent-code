/**
 * ResumeImportExport - 简历导入导出组件
 * 
 * 支持JSON/Word/PDF格式导入导出
 */

import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileJson, 
  FileText,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

const ResumeImportExport = ({ resume, onImport }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('export'); // 'export' or 'import'
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // 导出为JSON
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(resume, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resume.name || '简历'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导出为Markdown
  const handleExportMarkdown = () => {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    let md = `# ${resume.personal_info?.full_name || '姓名'}\n\n`;
    md += `**${resume.target_position || '求职意向'}**\n\n`;
    
    // 联系方式
    const contacts = [];
    if (resume.personal_info?.phone) contacts.push(`📱 ${resume.personal_info.phone}`);
    if (resume.personal_info?.email) contacts.push(`📧 ${resume.personal_info.email}`);
    if (resume.personal_info?.location) contacts.push(`📍 ${resume.personal_info.location}`);
    if (contacts.length > 0) {
      md += contacts.join(' | ') + '\n\n';
    }

    // 个人简介
    if (resume.personal_info?.summary) {
      md += `## 个人简介\n\n${resume.personal_info.summary}\n\n`;
    }

    // 工作经历
    if (resume.work_experience?.length > 0) {
      md += `## 工作经历\n\n`;
      resume.work_experience.forEach(exp => {
        md += `### ${exp.company} - ${exp.position}\n`;
        md += `*${formatDate(exp.start_date)} - ${exp.is_current ? '至今' : formatDate(exp.end_date)}*\n\n`;
        if (exp.description) {
          md += `${exp.description}\n\n`;
        }
      });
    }

    // 教育经历
    if (resume.education?.length > 0) {
      md += `## 教育经历\n\n`;
      resume.education.forEach(edu => {
        md += `### ${edu.school}\n`;
        md += `**${edu.degree}** · ${edu.major}\n`;
        md += `*${formatDate(edu.start_date)} - ${formatDate(edu.end_date)}*\n\n`;
      });
    }

    // 技能
    if (resume.skills?.length > 0) {
      md += `## 技能特长\n\n`;
      resume.skills.forEach(skill => {
        const levelText = ['入门', '初级', '中级', '高级', '专家'][skill.level - 1];
        md += `- **${skill.name}** (${levelText})\n`;
      });
      md += '\n';
    }

    // 项目经历
    if (resume.projects?.length > 0) {
      md += `## 项目经历\n\n`;
      resume.projects.forEach(project => {
        md += `### ${project.name}\n`;
        if (project.role) {
          md += `**${project.role}**\n`;
        }
        md += `*${formatDate(project.start_date)} - ${formatDate(project.end_date)}*\n\n`;
        if (project.description) {
          md += `${project.description}\n\n`;
        }
        if (project.technologies?.length > 0) {
          md += `**技术栈:** ${project.technologies.join(', ')}\n\n`;
        }
      });
    }

    const dataBlob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resume.name || '简历'}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 处理文件选择
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setImportData(content);
        setImportError('');
      } catch (error) {
        setImportError('读取文件失败');
      }
    };
    reader.readAsText(file);
  };

  // 处理导入
  const handleImport = () => {
    try {
      setImportError('');
      const data = JSON.parse(importData);
      
      // 验证基本结构
      if (!data.personal_info && !data.work_experience && !data.education) {
        throw new Error('无效的简历数据格式');
      }

      if (onImport) {
        onImport(data);
      }
      
      setImportSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setImportSuccess(false);
        setImportData('');
      }, 1500);
    } catch (error) {
      setImportError(error.message || '导入失败，请检查JSON格式');
    }
  };

  const openExportModal = () => {
    setModalMode('export');
    setShowModal(true);
  };

  const openImportModal = () => {
    setModalMode('import');
    setShowModal(false);
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* 导入导出按钮组 */}
      <div className="flex items-center gap-2">
        <button
          onClick={openImportModal}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="导入JSON"
        >
          <Upload className="w-4 h-4" />
          导入
        </button>
        <button
          onClick={openExportModal}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="导出"
        >
          <Download className="w-4 h-4" />
          导出
        </button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 导出模态框 */}
      {showModal && modalMode === 'export' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                导出简历
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-3">
              <button
                onClick={handleExportJSON}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                  <FileJson className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">导出为 JSON</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">包含完整数据的结构化格式</p>
                </div>
              </button>

              <button
                onClick={handleExportMarkdown}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">导出为 Markdown</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">适合阅读和编辑的文本格式</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入数据编辑模态框 */}
      {importData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                导入简历数据
              </h3>
              <button
                onClick={() => {
                  setImportData('');
                  setImportError('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              {importError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{importError}</span>
                </div>
              )}
              
              {importSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">导入成功！</span>
                </div>
              )}

              <textarea
                value={importData}
                onChange={(e) => {
                  setImportData(e.target.value);
                  setImportError('');
                }}
                className="w-full h-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="粘贴JSON格式的简历数据..."
              />
              
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                支持导入之前导出的JSON格式简历数据
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setImportData('');
                  setImportError('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importSuccess}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResumeImportExport;
