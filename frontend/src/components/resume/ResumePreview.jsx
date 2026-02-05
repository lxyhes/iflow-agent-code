/**
 * ResumePreview - 简历预览组件
 * 
 * 实时预览简历渲染效果，支持导出PDF
 */

import React, { useRef, useState } from 'react';
import { 
  Download, 
  FileText, 
  Printer,
  Palette,
  ChevronDown,
  Check
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TEMPLATES = {
  modern: {
    name: '现代简约',
    bgColor: 'bg-white',
    headerColor: 'bg-gray-900',
    textColor: 'text-gray-900',
    accentColor: 'text-blue-600',
  },
  professional: {
    name: '专业商务',
    bgColor: 'bg-white',
    headerColor: 'bg-blue-900',
    textColor: 'text-gray-800',
    accentColor: 'text-blue-800',
  },
  creative: {
    name: '创意设计',
    bgColor: 'bg-white',
    headerColor: 'bg-gradient-to-r from-purple-600 to-pink-600',
    textColor: 'text-gray-800',
    accentColor: 'text-purple-600',
  },
  minimal: {
    name: '极简风格',
    bgColor: 'bg-white',
    headerColor: 'bg-white border-b-2 border-gray-900',
    textColor: 'text-gray-900',
    accentColor: 'text-gray-600',
  },
};

const ResumePreview = ({ resume }) => {
  const previewRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [isExporting, setIsExporting] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const template = TEMPLATES[selectedTemplate];

  const handleExportPDF = async () => {
    if (!previewRef.current) return;
    
    setIsExporting(true);
    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      let imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const fileName = `${resume.name || '简历'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('导出PDF失败:', error);
      alert('导出PDF失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // 现代简约模板
  const ModernTemplate = () => (
    <div className="bg-white text-gray-900 min-h-[297mm] p-8">
      {/* 头部 */}
      <div className="border-b-2 border-gray-900 pb-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {resume.personal_info?.full_name || '姓名'}
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          {resume.target_position || '求职意向'}
        </p>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
          {resume.personal_info?.phone && (
            <span>{resume.personal_info.phone}</span>
          )}
          {resume.personal_info?.email && (
            <span>{resume.personal_info.email}</span>
          )}
          {resume.personal_info?.location && (
            <span>{resume.personal_info.location}</span>
          )}
        </div>
      </div>

      {/* 个人简介 */}
      {resume.personal_info?.summary && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-3">
            个人简介
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {resume.personal_info.summary}
          </p>
        </div>
      )}

      {/* 工作经历 */}
      {resume.work_experience?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-3">
            工作经历
          </h2>
          <div className="space-y-4">
            {resume.work_experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exp.company}</h3>
                    <p className="text-gray-700">{exp.position}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-gray-600 text-sm mt-2">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教育经历 */}
      {resume.education?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-3">
            教育经历
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{edu.school}</h3>
                  <p className="text-gray-700">{edu.degree} · {edu.major}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能 */}
      {resume.skills?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-3">
            技能特长
          </h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill) => (
              <span
                key={skill.id}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {skill.name}
                <span className="text-gray-500 ml-1">
                  ({['入门', '初级', '中级', '高级', '专家'][skill.level - 1]})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 项目经历 */}
      {resume.projects?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-2 mb-3">
            项目经历
          </h2>
          <div className="space-y-4">
            {resume.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className="text-sm text-gray-500">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                {project.role && (
                  <p className="text-gray-700">{project.role}</p>
                )}
                {project.description && (
                  <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.technologies.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 工具栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            简历预览
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 模板选择 */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Palette className="w-4 h-4" />
              {TEMPLATES[selectedTemplate].name}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showTemplateMenu && (
              <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTemplate(key);
                      setShowTemplateMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    {tmpl.name}
                    {selectedTemplate === key && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

          {/* 打印按钮 */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            打印
          </button>

          {/* 导出PDF按钮 */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* 预览区域 */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[210mm] mx-auto bg-white shadow-lg">
          <div ref={previewRef} className="print:shadow-none">
            <ModernTemplate />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
