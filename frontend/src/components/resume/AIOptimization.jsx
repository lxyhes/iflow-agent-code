/**
 * AIOptimization - 一键AI优化组件
 *
 * 自动改进措辞和表达
 */

import React, { useState } from 'react';
import {
  Wand2,
  X,
  Check,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

// 优化规则库
const OPTIMIZATION_RULES = {
  weakVerbs: {
    pattern: /^(负责|参与|协助|做一些|帮忙)/,
    replacements: {
      '负责': ['主导', '统筹', '带领', '管理'],
      '参与': ['深度参与', '核心贡献', '协作完成'],
      '协助': ['支持', '配合', '协同'],
      '做一些': ['完成', '实现', '推进'],
      '帮忙': ['协助', '支持']
    }
  },
  passiveVoice: {
    pattern: /(被|由|受).*?(完成|实现|设计)/,
    suggestion: '尝试使用主动语态，突出个人贡献'
  },
  vagueWords: {
    pattern: /(很多|一些|若干|大量)/,
    replacements: ['具体数字', '量化描述']
  }
};

// 优化模板
const OPTIMIZATION_TEMPLATES = {
  experience: [
    {
      original: '负责公司官网的开发工作',
      optimized: '主导公司官网从0到1的开发，运用React+TypeScript技术栈，实现页面加载速度提升40%',
      improvements: ['使用更有力的动词', '添加技术栈', '补充量化成果']
    },
    {
      original: '参与电商平台的开发',
      optimized: '作为核心开发成员参与电商平台重构，负责订单模块设计与实现，支撑日均百万级订单处理',
      improvements: ['明确角色定位', '补充具体职责', '添加量化数据']
    },
    {
      original: '协助团队完成项目',
      optimized: '协同产品、设计团队完成XX项目，推动项目提前2周上线，用户满意度提升25%',
      improvements: ['具体协作对象', '添加项目成果', '量化收益']
    }
  ],
  project: [
    {
      original: '做了一个数据分析系统',
      optimized: '独立设计并实现数据分析平台，整合10+数据源，为业务决策提供数据支撑，报表生成效率提升300%',
      improvements: ['使用专业术语', '补充系统规模', '量化价值']
    }
  ],
  summary: [
    {
      original: '我是一名前端工程师，有3年工作经验',
      optimized: '5年前端开发经验，精通React/Vue生态，擅长性能优化与工程化建设，主导过多个大型项目从0到1落地',
      improvements: ['突出经验年限', '列举核心技能', '强调项目经验']
    }
  ]
};

const AIOptimization = ({ resume, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState([]);
  const [selectedOptimizations, setSelectedOptimizations] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);

  const steps = [
    { id: 'analyze', name: '分析简历', description: 'AI正在分析您的简历内容...' },
    { id: 'optimize', name: '智能优化', description: '基于最佳实践生成优化建议...' },
    { id: 'review', name: '查看结果', description: '查看并选择要应用的优化' }
  ];

  const startOptimization = async () => {
    setIsOptimizing(true);
    setCurrentStep(0);

    // 模拟分析过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCurrentStep(1);

    // 模拟优化过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 生成优化结果
    const results = generateOptimizationResults(resume);
    setOptimizationResults(results);
    setCurrentStep(2);
    setIsOptimizing(false);
  };

  const generateOptimizationResults = (resume) => {
    const results = [];

    // 分析个人简介
    if (resume.personal_info?.summary) {
      const summary = resume.personal_info.summary;
      if (summary.length < 50) {
        results.push({
          type: 'summary',
          field: 'personal_info.summary',
          title: '个人简介',
          original: summary,
          optimized: `${summary} 擅长技术架构设计与团队协作，主导过多个大型项目从0到1落地，具备良好的问题解决能力。`,
          improvements: ['补充核心能力', '添加项目经验', '突出软技能'],
          reason: '个人简介过短，建议补充更多亮点'
        });
      }
    }

    // 分析工作经历
    (resume.workExperiences || []).forEach((exp, index) => {
      if (exp.description) {
        // 检查是否包含平淡词汇
        if (/^(负责|参与)/.test(exp.description)) {
          const templates = OPTIMIZATION_TEMPLATES.experience;
          const template = templates[index % templates.length];

          results.push({
            type: 'experience',
            field: `workExperiences[${index}].description`,
            title: `${exp.company} - ${exp.position}`,
            original: exp.description,
            optimized: exp.description
              .replace(/^负责/, '主导')
              .replace(/^参与/, '深度参与')
              .replace(/开发/, '设计与开发')
              .replace(/工作/, '工作，实现核心功能'),
            improvements: ['使用更有力的动词', '补充具体职责', '突出个人贡献'],
            reason: '描述使用了较为平淡的词汇，建议增强表达力度'
          });
        }

        // 检查是否缺少量化
        if (!/\d+%?|\d+倍|\d+万/i.test(exp.description)) {
          results.push({
            type: 'experience',
            field: `workExperiences[${index}].description`,
            title: `${exp.company} - ${exp.position}`,
            original: exp.description,
            optimized: `${exp.description}，提升系统性能30%，服务用户规模达100万+`,
            improvements: ['添加量化成果', '补充数据支撑'],
            reason: '缺少量化成果，建议添加具体数据增强说服力'
          });
        }
      }
    });

    // 分析项目经历
    (resume.projects || []).forEach((project, index) => {
      if (project.description) {
        if (project.description.length < 30) {
          results.push({
            type: 'project',
            field: `projects[${index}].description`,
            title: `项目：${project.name}`,
            original: project.description,
            optimized: `${project.description}。采用${project.technologies?.[0] || '先进技术'}架构，实现高可用、高性能的系统设计，支撑日均百万级请求。`,
            improvements: ['补充技术架构', '添加系统规模', '量化处理能力'],
            reason: '项目描述过于简单，建议补充技术细节和成果'
          });
        }
      }
    });

    return results;
  };

  const toggleItem = (index) => {
    setExpandedItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleSelection = (index) => {
    setSelectedOptimizations(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const applyOptimizations = () => {
    const selected = optimizationResults.filter((_, index) =>
      selectedOptimizations.includes(index)
    );

    if (onApply) {
      onApply(selected);
    }

    setIsOpen(false);
    setCurrentStep(0);
    setOptimizationResults([]);
    setSelectedOptimizations([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl"
      >
        <Wand2 className="w-4 h-4" />
        <span>AI一键优化</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI一键优化
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                智能改进简历措辞和表达
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? 'bg-pink-600 text-white'
                      : index === currentStep
                      ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-2 border-pink-600'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-pink-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {currentStep < 2 ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <RefreshCw className={`w-10 h-10 text-pink-600 dark:text-pink-400 ${isOptimizing ? 'animate-spin' : ''}`} />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mt-6">
                {steps[currentStep].name}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {steps[currentStep].description}
              </p>

              {currentStep === 0 && !isOptimizing && (
                <button
                  onClick={startOptimization}
                  className="mt-6 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  开始优化
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  发现 {optimizationResults.length} 处可优化内容
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedOptimizations(optimizationResults.map((_, i) => i))}
                    className="text-xs text-pink-600 dark:text-pink-400 hover:underline"
                  >
                    全选
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setSelectedOptimizations([])}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    取消全选
                  </button>
                </div>
              </div>

              {optimizationResults.map((result, index) => {
                const isExpanded = expandedItems.includes(index);
                const isSelected = selectedOptimizations.includes(index);

                return (
                  <div
                    key={index}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? 'border-pink-300 dark:border-pink-600 bg-pink-50 dark:bg-pink-900/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(index)}
                          className="mt-1 w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {result.title}
                            </h5>
                            <button
                              onClick={() => toggleItem(index)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {result.reason}
                          </p>

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">原文：</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {result.original}
                                </p>
                              </div>

                              <div className="flex justify-center">
                                <ArrowDown className="w-4 h-4 text-gray-400" />
                              </div>

                              <div className="p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
                                <p className="text-xs text-pink-600 dark:text-pink-400 mb-1">优化后：</p>
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                  {result.optimized}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {result.improvements.map((imp, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
                                  >
                                    ✓ {imp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {optimizationResults.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>恭喜！您的简历已经很完善了</p>
                  <p className="text-sm mt-1">没有发现需要优化的地方</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep === 2 && optimizationResults.length > 0 && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCurrentStep(0)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              重新分析
            </button>
            <button
              onClick={applyOptimizations}
              disabled={selectedOptimizations.length === 0}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              应用选中优化 ({selectedOptimizations.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ArrowDown = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

export default AIOptimization;
