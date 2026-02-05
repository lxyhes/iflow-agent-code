/**
 * ActionVerbsLibrary - 行动词推荐库组件
 *
 * 提供专业的动词来开头每句话
 */

import React, { useState } from 'react';
import {
  Zap,
  X,
  Copy,
  Check,
  Search,
  Code2,
  Users,
  MessageSquare,
  Lightbulb,
  Briefcase
} from 'lucide-react';

// 行动词库
const ACTION_VERBS = {
  technical: {
    name: '技术类',
    icon: Code2,
    color: 'blue',
    verbs: [
      { word: '开发', desc: '创建、编写代码实现功能' },
      { word: '设计', desc: '规划系统架构或界面' },
      { word: '实现', desc: '将想法转化为实际产品' },
      { word: '优化', desc: '改进性能、效率或体验' },
      { word: '重构', desc: '改进代码结构而不改变功能' },
      { word: '架构', desc: '设计系统整体结构' },
      { word: '搭建', desc: '建立基础设施或框架' },
      { word: '部署', desc: '将代码发布到生产环境' },
      { word: '维护', desc: '持续修复问题和更新' },
      { word: '调试', desc: '排查和解决程序错误' },
      { word: '测试', desc: '验证功能正确性' },
      { word: '集成', desc: '将不同系统或模块组合' },
      { word: '迁移', desc: '将系统或数据转移到新平台' },
      { word: '升级', desc: '提升版本或功能' },
      { word: '封装', desc: '将功能打包成可复用组件' },
      { word: '抽象', desc: '提取通用模式或接口' },
      { word: '解耦', desc: '降低模块间依赖' },
      { word: '压缩', desc: '减少体积或复杂度' },
      { word: '缓存', desc: '存储数据以提高访问速度' },
      { word: '加密', desc: '保护数据安全' }
    ]
  },
  management: {
    name: '管理类',
    icon: Users,
    color: 'purple',
    verbs: [
      { word: '带领', desc: '引导团队达成目标' },
      { word: '管理', desc: '负责团队或项目运营' },
      { word: '统筹', desc: '全面规划和协调资源' },
      { word: '协调', desc: '促进各方合作' },
      { word: '组织', desc: '安排人员和活动' },
      { word: '推动', desc: '促进项目或变革进展' },
      { word: '负责', desc: '承担主要责任' },
      { word: '主导', desc: '起主要作用并引领' },
      { word: '监督', desc: '监控进度和质量' },
      { word: '指导', desc: '给予方向和建议' },
      { word: '培养', desc: '帮助团队成员成长' },
      { word: '评估', desc: '评价绩效或方案' },
      { word: '分配', desc: '合理分派任务' },
      { word: '激励', desc: '激发团队积极性' },
      { word: '招聘', desc: '选拔合适人才' },
      { word: '组建', desc: '建立新团队' },
      { word: '规划', desc: '制定长期计划' },
      { word: '决策', desc: '做出关键决定' },
      { word: '授权', desc: '赋予他人权力' },
      { word: '考核', desc: '评估工作表现' }
    ]
  },
  communication: {
    name: '沟通类',
    icon: MessageSquare,
    color: 'green',
    verbs: [
      { word: '沟通', desc: '信息交流和协商' },
      { word: '协作', desc: '与他人合作完成' },
      { word: '对接', desc: '与外部或上下游连接' },
      { word: '整合', desc: '将不同资源合并' },
      { word: '促进', desc: '推动事情发展' },
      { word: '建立', desc: '创建关系或机制' },
      { word: '维护', desc: '保持良好关系' },
      { word: '汇报', desc: '向上级报告进展' },
      { word: '演示', desc: '展示成果或方案' },
      { word: '培训', desc: '传授知识和技能' },
      { word: '分享', desc: '传播经验和知识' },
      { word: '访谈', desc: '深入了解需求' },
      { word: '调研', desc: '收集信息和意见' },
      { word: '反馈', desc: '提供意见和建议' },
      { word: '说服', desc: '让他人接受观点' },
      { word: '谈判', desc: '达成共识或协议' },
      { word: '主持', desc: '组织会议或活动' },
      { word: '记录', desc: '整理和保存信息' },
      { word: '发布', desc: '对外公布信息' },
      { word: '推广', desc: '扩大影响力' }
    ]
  },
  innovation: {
    name: '创新类',
    icon: Lightbulb,
    color: 'orange',
    verbs: [
      { word: '创新', desc: '提出新想法或方法' },
      { word: '改进', desc: '使变得更好' },
      { word: '优化', desc: '提升效率和效果' },
      { word: '提升', desc: '提高到更高水平' },
      { word: '突破', desc: '打破限制或记录' },
      { word: '探索', desc: '尝试新的可能性' },
      { word: '引入', desc: '引进新技术或方法' },
      { word: '推动', desc: '促进变革发生' },
      { word: '变革', desc: '进行重大改变' },
      { word: '颠覆', desc: '彻底改变行业格局' },
      { word: '首创', desc: '首次创造或实现' },
      { word: '研发', desc: '研究和开发新产品' },
      { word: '试点', desc: '小规模试验新方案' },
      { word: '迭代', desc: '持续改进版本' },
      { word: '重构', desc: '重新设计架构' },
      { word: '转型', desc: '改变业务模式' },
      { word: '升级', desc: '提升到新版本' },
      { word: '整合', desc: '融合不同元素' },
      { word: '定制', desc: '根据需求个性化' },
      { word: '自动化', desc: '减少人工干预' }
    ]
  },
  business: {
    name: '业务类',
    icon: Briefcase,
    color: 'red',
    verbs: [
      { word: '分析', desc: '深入研究数据或问题' },
      { word: '解决', desc: '找到问题答案' },
      { word: '处理', desc: '应对各种情况' },
      { word: '完成', desc: '达成目标或任务' },
      { word: '达成', desc: '实现预定目标' },
      { word: '实现', desc: '使成为现实' },
      { word: '提高', desc: '增加数量或质量' },
      { word: '降低', desc: '减少成本或风险' },
      { word: '增长', desc: '扩大规模或收益' },
      { word: '控制', desc: '管理成本和风险' },
      { word: '确保', desc: '保证质量或安全' },
      { word: '保障', desc: '提供可靠支持' },
      { word: '支持', desc: '为业务提供助力' },
      { word: '服务', desc: '满足客户需求' },
      { word: '运营', desc: '日常管理和执行' },
      { word: '监控', desc: '实时跟踪指标' },
      { word: '预警', desc: '提前发现问题' },
      { word: '响应', desc: '快速应对需求' },
      { word: '交付', desc: '按时提供成果' },
      { word: '落地', desc: '将方案变为现实' }
    ]
  }
};

const ActionVerbsLibrary = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedWord, setCopiedWord] = useState(null);

  const handleCopy = (word) => {
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 2000);
  };

  const handleSelect = (word) => {
    if (onSelect) {
      onSelect(word);
    }
    setIsOpen(false);
  };

  // 过滤动词
  const filteredVerbs = React.useMemo(() => {
    let verbs = [];

    if (activeCategory === 'all') {
      Object.entries(ACTION_VERBS).forEach(([key, category]) => {
        verbs = [...verbs, ...category.verbs.map(v => ({ ...v, category: key }))];
      });
    } else {
      const category = ACTION_VERBS[activeCategory];
      if (category) {
        verbs = category.verbs.map(v => ({ ...v, category: activeCategory }));
      }
    }

    if (searchTerm) {
      verbs = verbs.filter(v =>
        v.word.includes(searchTerm) ||
        v.desc.includes(searchTerm)
      );
    }

    return verbs;
  }, [activeCategory, searchTerm]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
      >
        <Zap className="w-4 h-4" />
        <span>行动词库</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                行动词推荐库
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                200+专业动词，让简历描述更有力
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
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧分类 */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                activeCategory === 'all'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">全部</span>
              </div>
            </button>

            {Object.entries(ACTION_VERBS).map(([key, category]) => {
              const Icon = category.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    activeCategory === key
                      ? `bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-700 dark:text-${category.color}-400`
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 flex flex-col">
            {/* 搜索栏 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索行动词..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 动词列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredVerbs.map((verb, index) => {
                  const category = ACTION_VERBS[verb.category];
                  const Icon = category?.icon || Zap;

                  return (
                    <div
                      key={index}
                      className="group p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {verb.word}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full bg-${category?.color}-100 dark:bg-${category?.color}-900/30 text-${category?.color}-700 dark:text-${category?.color}-400`}>
                            {category?.name}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(verb.word)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="复制"
                          >
                            {copiedWord === verb.word ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {verb.desc}
                      </p>
                      <button
                        onClick={() => handleSelect(verb.word)}
                        className="mt-3 w-full py-1.5 text-sm text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        使用此词
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredVerbs.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>没有找到匹配的行动词</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-500" />
              <span>技术类: 20个</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span>管理类: 20个</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-green-500" />
              <span>沟通类: 20个</span>
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-orange-500" />
              <span>创新类: 20个</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-red-500" />
              <span>业务类: 20个</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionVerbsLibrary;
