/**
 * ResumePreview - 简历预览组件
 * 
 * 实时预览简历渲染效果，支持导出PDF和模板切换
 * 采用现代化设计语言，注重留白、层次和视觉节奏
 */

import React, { useRef, useState } from 'react';
import { 
  Download, 
  FileText, 
  Printer,
  Palette,
  ChevronDown,
  Check,
  Briefcase,
  GraduationCap,
  Code,
  FolderGit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft,
  Edit3
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// 模板配置 - 包含更详细的设计规范
const TEMPLATES = {
  modern: {
    name: '现代简约',
    description: '简洁现代的设计，适合大多数职位',
    primaryColor: '#0f172a',
    accentColor: '#3b82f6',
    bgColor: '#ffffff',
  },
  professional: {
    name: '专业商务',
    description: '传统商务风格，适合金融、咨询等行业',
    primaryColor: '#1e3a5f',
    accentColor: '#2563eb',
    bgColor: '#ffffff',
  },
  creative: {
    name: '创意设计',
    description: '富有创意的设计，适合设计、艺术类职位',
    primaryColor: '#7c3aed',
    accentColor: '#ec4899',
    bgColor: '#faf5ff',
  },
  technical: {
    name: '技术风格',
    description: '清晰的技术风格，适合IT、工程类职位',
    primaryColor: '#059669',
    accentColor: '#10b981',
    bgColor: '#f0fdf4',
  },
  minimal: {
    name: '极简风格',
    description: '极简主义设计，突出重点内容',
    primaryColor: '#171717',
    accentColor: '#525252',
    bgColor: '#fafafa',
  },
  elegant: {
    name: '优雅精致',
    description: '优雅精致的风格，适合高端职位',
    primaryColor: '#451a03',
    accentColor: '#b45309',
    bgColor: '#fffbeb',
  },
};

const ResumePreview = ({ resume, onBack, onEdit }) => {
  const previewRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState(resume?.template || 'modern');
  const [isExporting, setIsExporting] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const currentTemplate = TEMPLATES[selectedTemplate];

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

  const parseJSON = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  };

  // 现代简约模板 - 重新设计
  const ModernTemplate = () => (
    <div className="bg-white min-h-[297mm] p-12">
      {/* 头部 - 更大的留白和更清晰的层次 */}
      <header className="mb-10 flex items-start gap-6">
        {/* 头像 */}
        {resume.personal_info?.avatar && (
          <div className="flex-shrink-0">
            <img
              src={resume.personal_info.avatar}
              alt="头像"
              className="w-24 h-24 rounded-full object-cover border-4 border-slate-100"
            />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-3">
            {resume.personal_info?.full_name || '姓名'}
          </h1>
          <p className="text-xl text-slate-500 font-light mb-6">
            {resume.target_position || '求职意向'}
          </p>

          {/* 联系信息 - 使用图标和更好的间距 */}
          <div className="flex flex-wrap gap-6 text-sm text-slate-600">
            {resume.personal_info?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{resume.personal_info.phone}</span>
              </div>
            )}
            {resume.personal_info?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{resume.personal_info.email}</span>
              </div>
            )}
            {resume.personal_info?.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{resume.personal_info.location}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 个人简介 */}
      {resume.personal_info?.summary && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">个人简介</h2>
          </div>
          <p className="text-slate-600 leading-relaxed pl-11">
            {resume.personal_info.summary}
          </p>
        </section>
      )}

      {/* 工作经历 */}
      {resume.work_experience?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">工作经历</h2>
          </div>
          <div className="space-y-6 pl-11">
            {resume.work_experience.map((exp) => (
              <div key={exp.id} className="relative">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{exp.company}</h3>
                    <p className="text-slate-600">{exp.position}</p>
                  </div>
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-slate-500 text-sm leading-relaxed">{exp.description}</p>
                )}
                {exp.achievements && (
                  <ul className="mt-2 space-y-1">
                    {parseJSON(exp.achievements)?.map((achievement, idx) => (
                      <li key={idx} className="text-slate-500 text-sm flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 项目经历 */}
      {resume.projects?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <FolderGit className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">项目经历</h2>
          </div>
          <div className="space-y-6 pl-11">
            {resume.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-900 text-lg">{project.name}</h3>
                  <span className="text-sm text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                {project.role && (
                  <p className="text-slate-600 mb-1">{project.role}</p>
                )}
                {project.description && (
                  <p className="text-slate-500 text-sm leading-relaxed mb-2">{project.description}</p>
                )}
                {project.technologies && (
                  <div className="flex flex-wrap gap-2">
                    {parseJSON(project.technologies)?.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 教育经历 */}
      {resume.education?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">教育经历</h2>
          </div>
          <div className="space-y-4 pl-11">
            {resume.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900">{edu.school}</h3>
                  <p className="text-slate-600">{edu.degree} · {edu.major}</p>
                </div>
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 技能 */}
      {resume.skills?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Code className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">技能特长</h2>
          </div>
          <div className="flex flex-wrap gap-2 pl-11">
            {resume.skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
              >
                <span className="text-slate-700 font-medium text-sm">{skill.name}</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i < skill.level ? 'bg-blue-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // 专业商务模板 - 重新设计
  const ProfessionalTemplate = () => (
    <div className="bg-white min-h-[297mm]">
      {/* 头部 - 深蓝色主题 */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-12">
        <h1 className="text-4xl font-bold mb-3">
          {resume.personal_info?.full_name || '姓名'}
        </h1>
        <p className="text-xl text-blue-200 mb-6">
          {resume.target_position || '求职意向'}
        </p>
        <div className="flex flex-wrap gap-6 text-sm text-blue-100">
          {resume.personal_info?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{resume.personal_info.phone}</span>
            </div>
          )}
          {resume.personal_info?.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>{resume.personal_info.email}</span>
            </div>
          )}
          {resume.personal_info?.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{resume.personal_info.location}</span>
            </div>
          )}
        </div>
      </header>

      <div className="p-12">
        {/* 个人简介 */}
        {resume.personal_info?.summary && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-4">
              个人简介
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {resume.personal_info.summary}
            </p>
          </section>
        )}

        {/* 工作经历 */}
        {resume.work_experience?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-6">
              工作经历
            </h2>
            <div className="space-y-6">
              {resume.work_experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900">{exp.company}</h3>
                      <p className="text-blue-700 font-medium">{exp.position}</p>
                    </div>
                    <span className="text-sm text-slate-500 font-medium bg-blue-50 px-3 py-1 rounded">
                      {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-slate-600 text-sm">{exp.description}</p>
                  )}
                  {exp.achievements && (
                    <ul className="mt-2 space-y-1">
                      {parseJSON(exp.achievements)?.map((achievement, idx) => (
                        <li key={idx} className="text-slate-500 text-sm flex items-start gap-2">
                          <span className="text-blue-500 mt-1">▸</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 项目经历 */}
        {resume.projects?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-6">
              项目经历
            </h2>
            <div className="space-y-6">
              {resume.projects.map((project) => (
                <div key={project.id}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900">{project.name}</h3>
                    <span className="text-sm text-slate-500 font-medium bg-blue-50 px-3 py-1 rounded">
                      {formatDate(project.start_date)} - {formatDate(project.end_date)}
                    </span>
                  </div>
                  {project.role && (
                    <p className="text-blue-700 font-medium mb-1">{project.role}</p>
                  )}
                  {project.description && (
                    <p className="text-slate-600 text-sm mb-2">{project.description}</p>
                  )}
                  {project.technologies && (
                    <div className="flex flex-wrap gap-2">
                      {parseJSON(project.technologies)?.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 教育经历 */}
        {resume.education?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-6">
              教育经历
            </h2>
            <div className="space-y-4">
              {resume.education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{edu.school}</h3>
                    <p className="text-blue-700">{edu.degree} · {edu.major}</p>
                  </div>
                  <span className="text-sm text-slate-500 font-medium bg-blue-50 px-3 py-1 rounded">
                    {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 技能 */}
        {resume.skills?.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-blue-900 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-6">
              技能特长
            </h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="px-4 py-2 bg-blue-50 text-blue-900 rounded font-medium"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  // 创意设计模板 - 重新设计
  const CreativeTemplate = () => (
    <div className="min-h-[297mm] bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 p-12">
      {/* 头部 - 渐变卡片 */}
      <header className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white shadow-xl mb-10">
        <h1 className="text-5xl font-bold mb-3">
          {resume.personal_info?.full_name || '姓名'}
        </h1>
        <p className="text-xl text-purple-100 mb-6">
          {resume.target_position || '求职意向'}
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          {resume.personal_info?.phone && (
            <span className="bg-white/20 backdrop-blur px-4 py-2 rounded-full">
              {resume.personal_info.phone}
            </span>
          )}
          {resume.personal_info?.email && (
            <span className="bg-white/20 backdrop-blur px-4 py-2 rounded-full">
              {resume.personal_info.email}
            </span>
          )}
          {resume.personal_info?.location && (
            <span className="bg-white/20 backdrop-blur px-4 py-2 rounded-full">
              {resume.personal_info.location}
            </span>
          )}
        </div>
      </header>

      {/* 个人简介 */}
      {resume.personal_info?.summary && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">关于我</h2>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm">
            <p className="text-slate-600 leading-relaxed">
              {resume.personal_info.summary}
            </p>
          </div>
        </section>
      )}

      {/* 工作经历 */}
      {resume.work_experience?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">工作经历</h2>
          </div>
          <div className="space-y-4">
            {resume.work_experience.map((exp) => (
              <div key={exp.id} className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{exp.company}</h3>
                    <p className="text-purple-600 font-medium">{exp.position}</p>
                  </div>
                  <span className="text-sm text-slate-400 bg-purple-50 px-3 py-1 rounded-full">
                    {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-slate-600 text-sm">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 项目经历 */}
      {resume.projects?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
              <FolderGit className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">项目经历</h2>
          </div>
          <div className="grid gap-4">
            {resume.projects.map((project) => (
              <div key={project.id} className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-900 text-lg">{project.name}</h3>
                  <span className="text-sm text-slate-400 bg-pink-50 px-3 py-1 rounded-full">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                {project.role && (
                  <p className="text-purple-600 font-medium mb-2">{project.role}</p>
                )}
                {project.description && (
                  <p className="text-slate-600 text-sm mb-3">{project.description}</p>
                )}
                {project.technologies && (
                  <div className="flex flex-wrap gap-2">
                    {parseJSON(project.technologies)?.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gradient-to-r from-violet-100 to-pink-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 教育经历 */}
      {resume.education?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">教育经历</h2>
          </div>
          <div className="space-y-4">
            {resume.education.map((edu) => (
              <div key={edu.id} className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900">{edu.school}</h3>
                  <p className="text-purple-600">{edu.degree} · {edu.major}</p>
                </div>
                <span className="text-sm text-slate-400 bg-purple-50 px-3 py-1 rounded-full">
                  {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 技能 */}
      {resume.skills?.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Code className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">技能特长</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {resume.skills.map((skill) => (
              <span
                key={skill.id}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full font-medium shadow-md"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // 技术风格模板 - 重新设计
  const TechnicalTemplate = () => (
    <div className="min-h-[297mm] bg-slate-50 p-12 font-mono">
      {/* 头部 - 终端风格 */}
      <header className="bg-slate-900 rounded-lg p-6 mb-10 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-green-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-500">$</span>
            <span className="text-yellow-400">cat</span>
            <span>profile.json</span>
          </div>
          <pre className="text-sm">
{`{
  "name": "${resume.personal_info?.full_name || '姓名'}",
  "position": "${resume.target_position || '求职意向'}",
  "contact": {
    "phone": "${resume.personal_info?.phone || ''}",
    "email": "${resume.personal_info?.email || ''}",
    "location": "${resume.personal_info?.location || ''}"
  }
}`}
          </pre>
        </div>
      </header>

      {/* 技能 - 优先展示 */}
      {resume.skills?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <span className="text-slate-400">$</span>
            <span>ls skills/</span>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              {resume.skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-3">
                  <span className="text-emerald-500">❯</span>
                  <span className="text-slate-700">{skill.name}</span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-sm ${
                          i < skill.level ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 个人简介 */}
      {resume.personal_info?.summary && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <span className="text-slate-400">$</span>
            <span>cat about.md</span>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <p className="text-slate-600 leading-relaxed">
              {resume.personal_info.summary}
            </p>
          </div>
        </section>
      )}

      {/* 项目经历 */}
      {resume.projects?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <span className="text-slate-400">$</span>
            <span>git log --projects</span>
          </div>
          <div className="space-y-4">
            {resume.projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900">{project.name}</h3>
                  <span className="text-sm text-slate-400">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                {project.role && (
                  <p className="text-emerald-600 mb-2">@{project.role}</p>
                )}
                {project.description && (
                  <p className="text-slate-600 text-sm mb-3">{project.description}</p>
                )}
                {project.technologies && (
                  <div className="text-sm">
                    <span className="text-slate-400">tech: [</span>
                    <span className="text-emerald-600">
                      {parseJSON(project.technologies)?.join(', ')}
                    </span>
                    <span className="text-slate-400">]</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 工作经历 */}
      {resume.work_experience?.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <span className="text-slate-400">$</span>
            <span>cat work_history.log</span>
          </div>
          <div className="space-y-4">
            {resume.work_experience.map((exp) => (
              <div key={exp.id} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{exp.company}</h3>
                    <p className="text-emerald-600">{exp.position}</p>
                  </div>
                  <span className="text-sm text-slate-400">
                    {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-slate-600 text-sm">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 教育经历 */}
      {resume.education?.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 text-emerald-600">
            <span className="text-slate-400">$</span>
            <span>cat education.json</span>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="space-y-4">
              {resume.education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{edu.school}</h3>
                    <p className="text-emerald-600">{edu.degree} · {edu.major}</p>
                  </div>
                  <span className="text-sm text-slate-400">
                    {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );

  // 极简风格模板 - 重新设计
  const MinimalTemplate = () => (
    <div className="min-h-[297mm] bg-white p-16">
      {/* 头部 - 大量留白 */}
      <header className="mb-16">
        <h1 className="text-5xl font-light text-slate-900 tracking-tight mb-4">
          {resume.personal_info?.full_name || '姓名'}
        </h1>
        <p className="text-xl text-slate-400 font-light">
          {resume.target_position || '求职意向'}
        </p>
        <div className="mt-8 space-y-1 text-sm text-slate-400">
          {resume.personal_info?.phone && (
            <p>{resume.personal_info.phone}</p>
          )}
          {resume.personal_info?.email && (
            <p>{resume.personal_info.email}</p>
          )}
          {resume.personal_info?.location && (
            <p>{resume.personal_info.location}</p>
          )}
        </div>
      </header>

      {/* 个人简介 */}
      {resume.personal_info?.summary && (
        <section className="mb-16">
          <p className="text-slate-600 leading-loose text-lg max-w-2xl">
            {resume.personal_info.summary}
          </p>
        </section>
      )}

      {/* 工作经历 */}
      {resume.work_experience?.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.3em] mb-8">
            工作经历
          </h2>
          <div className="space-y-8">
            {resume.work_experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-lg font-medium text-slate-900">{exp.company}</h3>
                  <span className="text-sm text-slate-400">
                    {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                  </span>
                </div>
                <p className="text-slate-500 mb-2">{exp.position}</p>
                {exp.description && (
                  <p className="text-slate-400 text-sm leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 教育经历 */}
      {resume.education?.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.3em] mb-8">
            教育经历
          </h2>
          <div className="space-y-6">
            {resume.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">{edu.school}</h3>
                  <p className="text-slate-500">{edu.degree} · {edu.major}</p>
                </div>
                <span className="text-sm text-slate-400">
                  {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 技能 */}
      {resume.skills?.length > 0 && (
        <section className="mb-16">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.3em] mb-8">
            技能
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {resume.skills.map((skill) => (
              <span key={skill.id} className="text-slate-600">
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 项目经历 */}
      {resume.projects?.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-[0.3em] mb-8">
            项目经历
          </h2>
          <div className="space-y-8">
            {resume.projects.map((project) => (
              <div key={project.id}>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-lg font-medium text-slate-900">{project.name}</h3>
                  <span className="text-sm text-slate-400">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                {project.role && (
                  <p className="text-slate-500 mb-2">{project.role}</p>
                )}
                {project.description && (
                  <p className="text-slate-400 text-sm leading-relaxed mb-2">{project.description}</p>
                )}
                {project.technologies && (
                  <p className="text-slate-300 text-sm">
                    {parseJSON(project.technologies)?.join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // 优雅精致模板 - 重新设计
  const ElegantTemplate = () => (
    <div className="min-h-[297mm] bg-amber-50/50 p-12">
      {/* 头部 - 优雅居中 */}
      <header className="text-center mb-12 pb-8 border-b-2 border-amber-200">
        <h1 className="text-5xl font-serif text-slate-900 mb-4">
          {resume.personal_info?.full_name || '姓名'}
        </h1>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-4"></div>
        <p className="text-xl text-amber-800 italic mb-6">
          {resume.target_position || '求职意向'}
        </p>
        <div className="flex justify-center flex-wrap gap-6 text-sm text-slate-600">
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
      </header>

      {/* 个人简介 */}
      {resume.personal_info?.summary && (
        <section className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-slate-600 leading-relaxed italic text-lg">
            "{resume.personal_info.summary}"
          </p>
        </section>
      )}

      {/* 工作经历 */}
      {resume.work_experience?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-center text-xl font-serif text-amber-800 mb-8">
            <span className="border-b-2 border-amber-300 pb-1">工作经历</span>
          </h2>
          <div className="space-y-6 max-w-4xl mx-auto">
            {resume.work_experience.map((exp) => (
              <div key={exp.id} className="bg-white rounded-lg p-6 shadow-sm border border-amber-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-serif font-semibold text-slate-900 text-xl">{exp.company}</h3>
                    <p className="text-amber-700">{exp.position}</p>
                  </div>
                  <span className="text-sm text-slate-500 italic">
                    {formatDate(exp.start_date)} - {exp.is_current ? '至今' : formatDate(exp.end_date)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-slate-600 text-sm leading-relaxed">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 项目经历 */}
      {resume.projects?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-center text-xl font-serif text-amber-800 mb-8">
            <span className="border-b-2 border-amber-300 pb-1">项目经历</span>
          </h2>
          <div className="space-y-6 max-w-4xl mx-auto">
            {resume.projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg p-6 shadow-sm border border-amber-100">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-serif font-semibold text-slate-900 text-xl">{project.name}</h3>
                  <span className="text-sm text-slate-500 italic">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </span>
                </div>
                {project.role && (
                  <p className="text-amber-700 mb-2">{project.role}</p>
                )}
                {project.description && (
                  <p className="text-slate-600 text-sm leading-relaxed mb-3">{project.description}</p>
                )}
                {project.technologies && (
                  <div className="flex flex-wrap gap-2">
                    {parseJSON(project.technologies)?.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 教育经历 */}
      {resume.education?.length > 0 && (
        <section className="mb-12">
          <h2 className="text-center text-xl font-serif text-amber-800 mb-8">
            <span className="border-b-2 border-amber-300 pb-1">教育经历</span>
          </h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            {resume.education.map((edu) => (
              <div key={edu.id} className="bg-white rounded-lg p-5 shadow-sm border border-amber-100 flex justify-between items-center">
                <div>
                  <h3 className="font-serif font-semibold text-slate-900">{edu.school}</h3>
                  <p className="text-amber-700">{edu.degree} · {edu.major}</p>
                </div>
                <span className="text-sm text-slate-500 italic">
                  {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 技能 */}
      {resume.skills?.length > 0 && (
        <section>
          <h2 className="text-center text-xl font-serif text-amber-800 mb-8">
            <span className="border-b-2 border-amber-300 pb-1">技能特长</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {resume.skills.map((skill) => (
              <span
                key={skill.id}
                className="px-5 py-2 bg-white border border-amber-200 text-slate-700 rounded-lg text-sm"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // 根据选择的模板渲染对应组件
  const renderTemplate = () => {
    switch (selectedTemplate) {
      case 'modern':
        return <ModernTemplate />;
      case 'professional':
        return <ProfessionalTemplate />;
      case 'creative':
        return <CreativeTemplate />;
      case 'technical':
        return <TechnicalTemplate />;
      case 'minimal':
        return <MinimalTemplate />;
      case 'elegant':
        return <ElegantTemplate />;
      default:
        return <ModernTemplate />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 工具栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 返回按钮 */}
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
          )}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            简历预览
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 编辑按钮 */}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              编辑
            </button>
          )}

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          {/* 模板选择 */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Palette className="w-4 h-4" />
              {TEMPLATES[selectedTemplate]?.name || '现代简约'}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showTemplateMenu && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 max-h-80 overflow-y-auto">
                {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTemplate(key);
                      setShowTemplateMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{tmpl.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]">{tmpl.description}</div>
                    </div>
                    {selectedTemplate === key && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
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
            {renderTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
