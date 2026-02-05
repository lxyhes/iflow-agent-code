/**
 * AIDescriptionGenerator - AI智能描述生成器
 * 
 * 根据职位和关键词自动生成专业的工作/项目描述
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  RefreshCw,
  Wand2,
  Building2,
  FolderKanban
} from 'lucide-react';

// 描述模板库
const DESCRIPTION_TEMPLATES = {
  technical: {
    name: '技术型',
    icon: '💻',
    templates: [
      {
        pattern: '{action} {technology}，实现{result}，{metric}',
        examples: [
          '使用React和TypeScript重构前端架构，实现页面加载速度提升40%',
          '基于微服务架构设计订单系统，支撑日均百万级订单处理',
          '运用机器学习算法优化推荐系统，用户点击率提升25%'
        ]
      },
      {
        pattern: '负责{system}的{development}，{achievement}',
        examples: [
          '负责支付核心系统的开发与维护，保障99.99%的系统可用性',
          '主导数据中台的设计与实现，支撑10+业务线的数据需求',
          '参与云原生平台的建设，将部署效率提升300%'
        ]
      }
    ]
  },
  management: {
    name: '管理型',
    icon: '👥',
    templates: [
      {
        pattern: '带领{team}完成{project}，{result}',
        examples: [
          '带领15人技术团队完成电商平台重构，项目提前2周上线',
          '管理跨部门协作项目，协调产品、设计、开发资源，按时交付',
          '组建并培养前端团队，建立技术规范和Code Review机制'
        ]
      },
      {
        pattern: '统筹{scope}，{improvement}，{metric}',
        examples: [
          '统筹产品技术规划，优化研发流程，迭代周期缩短30%',
          '负责技术选型与架构决策，降低系统复杂度，维护成本减少50%',
          '建立敏捷开发体系，团队交付效率提升60%'
        ]
      }
    ]
  },
  achievement: {
    name: '成果型',
    icon: '🏆',
    templates: [
      {
        pattern: '通过{method}，实现{result}，{data}',
        examples: [
          '通过性能优化手段，实现首屏加载时间从3s降至1s，用户留存提升20%',
          '通过引入自动化测试，将Bug率降低60%，发布周期缩短一半',
          '通过技术方案创新，节省服务器成本30万元/年'
        ]
      },
      {
        pattern: '主导{project}，{contribution}，获得{recognition}',
        examples: [
          '主导用户增长项目，设计裂变玩法，DAU从10万增长至50万',
          '负责核心模块性能优化，QPS提升5倍，获得公司技术创新奖',
          '推动前端工程化建设，团队人效提升40%，获年度最佳团队'
        ]
      }
    ]
  }
};

// 关键词扩展库
const KEYWORD_EXPANSIONS = {
  '前端': ['React', 'Vue', 'Angular', 'TypeScript', 'Webpack', '性能优化'],
  '后端': ['Java', 'Python', 'Go', '微服务', 'MySQL', 'Redis', '高并发'],
  '移动端': ['iOS', 'Android', 'React Native', 'Flutter', '性能调优'],
  'AI': ['机器学习', '深度学习', 'NLP', '推荐系统', 'TensorFlow'],
  '数据': ['数据分析', '数据仓库', 'ETL', 'BI', 'Hadoop', 'Spark'],
  '运维': ['Docker', 'Kubernetes', 'CI/CD', '监控', '自动化'],
  '产品': ['需求分析', '用户研究', '数据分析', '原型设计', '项目管理'],
  '设计': ['UI设计', 'UX设计', '交互设计', '视觉设计', 'Figma']
};

// 行动词库
const ACTION_VERBS = {
  technical: ['开发', '设计', '实现', '优化', '重构', '架构', '搭建', '部署'],
  management: ['带领', '管理', '统筹', '协调', '组织', '推动', '负责', '主导'],
  communication: ['沟通', '协作', '对接', '整合', '协调', '促进', '建立'],
  innovation: ['创新', '改进', '优化', '提升', '突破', '探索', '引入', '推动']
};

const AIDescriptionGenerator = ({ onInsert, type = 'experience' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState('');
  const [keywords, setKeywords] = useState('');
  const [style, setStyle] = useState('technical');
  const [generatedDescriptions, setGeneratedDescriptions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // 生成描述
  const generateDescriptions = () => {
    if (!position.trim()) return;
    
    setIsGenerating(true);
    
    // 模拟AI生成过程
    setTimeout(() => {
      const styleConfig = DESCRIPTION_TEMPLATES[style];
      const inputKeywords = keywords.split(/[,，]/).filter(k => k.trim());
      
      // 扩展关键词
      let expandedKeywords = [...inputKeywords];
      Object.entries(KEYWORD_EXPANSIONS).forEach(([key, values]) => {
        if (position.includes(key) || inputKeywords.some(k => k.includes(key))) {
          expandedKeywords = [...expandedKeywords, ...values];
        }
      });
      
      // 生成描述
      const descriptions = [];
      styleConfig.templates.forEach(templateGroup => {
        templateGroup.examples.forEach((example, idx) => {
          // 简单替换生成变体
          let desc = example;
          
          // 根据输入的职位和关键词进行个性化
          if (idx === 0 && position) {
            const verbs = ACTION_VERBS[style] || ACTION_VERBS.technical;
            const verb = verbs[Math.floor(Math.random() * verbs.length)];
            const tech = expandedKeywords[0] || '相关技术';
            desc = `${verb}${position}核心模块，运用${tech}，提升系统性能和用户体验`;
          }
          
          descriptions.push({
            text: desc,
            style: styleConfig.name,
            tags: expandedKeywords.slice(0, 3)
          });
        });
      });
      
      setGeneratedDescriptions(descriptions.slice(0, 5));
      setIsGenerating(false);
    }, 1500);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsert = (text) => {
    if (onInsert) {
      onInsert(text);
    }
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI生成描述</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI智能描述生成器
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                输入职位和关键词，自动生成专业描述
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* 输入区域 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {type === 'experience' ? '职位名称' : '项目名称'}
              </label>
              <div className="relative">
                {type === 'experience' ? (
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                ) : (
                  <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                )}
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder={type === 'experience' ? "例如：高级前端工程师" : "例如：电商平台重构项目"}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                关键词（用逗号分隔）
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="例如：React, 性能优化, 微前端"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                描述风格
              </label>
              <div className="flex gap-2">
                {Object.entries(DESCRIPTION_TEMPLATES).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setStyle(key)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      style === key
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <span>{config.icon}</span>
                    <span className="text-sm font-medium">{config.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateDescriptions}
              disabled={!position.trim() || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI生成中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>生成描述</span>
                </>
              )}
            </button>
          </div>

          {/* 生成结果 */}
          {generatedDescriptions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                生成的描述（点击使用）
              </h4>
              
              {generatedDescriptions.map((desc, index) => (
                <div
                  key={index}
                  className="group p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                >
                  <p className="text-gray-800 dark:text-gray-200 mb-3 leading-relaxed">
                    {desc.text}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                        {desc.style}
                      </span>
                      {desc.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(desc.text, index)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title="复制"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleInsert(desc.text)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                      >
                        使用
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDescriptionGenerator;
