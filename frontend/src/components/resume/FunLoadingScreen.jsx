/**
 * FunLoadingScreen - 有趣的 AI 处理等待界面
 *
 * 在等待 AI 分析/重写时展示简历技巧、趣味知识和互动元素
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lightbulb,
  Target,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  Coffee,
  Brain,
  Rocket,
  Star,
  Clock,
  CheckCircle,
  Quote
} from 'lucide-react';

// 简历技巧知识库
const resumeTips = [
  {
    category: '内容技巧',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    tips: [
      '使用 STAR 法则描述经历：情境(Situation)、任务(Task)、行动(Action)、结果(Result)',
      '量化你的成就：用数字说话，比如"提升销售额 30%"而不是"显著提升销售"',
      '动词开头：使用"主导"、"设计"、"实现"等强有力的动词',
      '针对性修改：根据每个职位调整简历关键词',
      '一页原则：工作经验少于 10 年，简历最好控制在一页内'
    ]
  },
  {
    category: 'ATS 优化',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    tips: [
      '使用标准字体：Arial、Calibri、Times New Roman 最保险',
      '避免表格和图形：ATS 系统可能无法正确解析',
      '关键词匹配：仔细阅读职位描述，使用其中的关键词',
      '标准标题：使用"工作经历"、"教育背景"等传统标题',
      '文件格式：除非特别要求，否则使用 PDF 格式'
    ]
  },
  {
    category: '职业发展',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    tips: [
      '持续学习：每年至少学习一项新技能并添加到简历',
      '建立个人品牌：在 LinkedIn 等专业平台保持一致的形象',
      '网络建设：80% 的好工作通过人脉获得，不只是投简历',
      '项目经验：没有工作经验？用个人项目展示能力',
      '软技能：沟通能力、领导力、团队协作同样重要'
    ]
  },
  {
    category: '面试准备',
    icon: Award,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    tips: [
      '准备故事：用具体事例回答行为面试问题',
      '研究公司：了解公司文化、产品和最近新闻',
      '提问环节：准备 3-5 个有深度的问题问面试官',
      '模拟面试：找朋友练习，或对着镜子练习',
      '跟进感谢：面试后 24 小时内发送感谢邮件'
    ]
  }
];

// 趣味简历冷知识
const funFacts = [
  '平均每个职位会收到 250 份简历',
  'HR 平均只用 6 秒扫视一份简历',
  '简历中有照片会降低 88% 的被联系几率（美国）',
  '使用行业关键词能让简历通过率提高 70%',
  '周一投递简历的回复率最高',
  '简历中出现错别字会被 77% 的 HR 直接淘汰',
  'LinkedIn 上完整的个人资料能获得 40 倍更多机会',
  '视频简历的观看完成率只有 15%',
  '使用 "我们" 而不是 "我" 会降低你的竞争力',
  '95% 的 Fortune 500 公司使用 ATS 系统筛选简历'
];

// 励志名言
const quotes = [
  { text: '机会总是留给有准备的人。', author: '路易·巴斯德' },
  { text: '你的职业生涯是一场马拉松，不是短跑。', author: '谢丽尔·桑德伯格' },
  { text: '成功不是终点，失败也不是终结，唯有勇气才是永恒。', author: '温斯顿·丘吉尔' },
  { text: '做你喜欢的事，你这一生就无需工作。', author: '孔子' },
  { text: '最好的投资就是投资自己。', author: '沃伦·巴菲特' },
  { text: '不要等待机会，而要创造机会。', author: '乔治·萧伯纳' },
  { text: '你的价值不取决于别人的评价。', author: '埃莉诺·罗斯福' },
  { text: '每一次拒绝都让你离接受更近一步。', author: '佚名' }
];

// 进度阶段
const progressStages = [
  { icon: BookOpen, text: '正在阅读您的简历...', duration: 10 },
  { icon: Brain, text: 'AI 正在分析内容质量...', duration: 25 },
  { icon: Target, text: '评估 ATS 兼容性...', duration: 40 },
  { icon: Lightbulb, text: '生成优化建议...', duration: 60 },
  { icon: Sparkles, text: '重写专业表达...', duration: 80 },
  { icon: Rocket, text: '即将完成！', duration: 95 }
];

const FunLoadingScreen = ({ 
  title = 'AI 正在处理中...', 
  subtitle = '这可能需要 30-60 秒',
  progress = 0 
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [showFact, setShowFact] = useState(false);
  const [typedText, setTypedText] = useState('');

  // 轮播简历技巧
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % resumeTips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // 轮播趣味知识
  useEffect(() => {
    const interval = setInterval(() => {
      setShowFact(true);
      setTimeout(() => {
        setCurrentFact((prev) => (prev + 1) % funFacts.length);
        setShowFact(false);
      }, 500);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // 轮播名言
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // 更新进度阶段
  useEffect(() => {
    const stageIndex = progressStages.findIndex((stage, idx) => {
      const nextStage = progressStages[idx + 1];
      return progress >= stage.duration && (!nextStage || progress < nextStage.duration);
    });
    if (stageIndex !== -1 && stageIndex !== currentStage) {
      setCurrentStage(stageIndex);
    }
  }, [progress, currentStage]);

  // 打字机效果
  useEffect(() => {
    const currentTipText = resumeTips[currentTip].tips[0];
    let index = 0;
    setTypedText('');
    
    const typeInterval = setInterval(() => {
      if (index < currentTipText.length) {
        setTypedText(currentTipText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [currentTip]);

  const tip = resumeTips[currentTip];
  const StageIcon = progressStages[currentStage]?.icon || Sparkles;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
      {/* 主标题和动画 */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-ping opacity-20" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <StageIcon className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      {/* 进度条 */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            处理中
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          >
            <div className="h-full w-full bg-white/20 animate-pulse" />
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
          {progressStages[currentStage]?.text || '正在处理...'}
        </p>
      </div>

      {/* 简历技巧卡片 */}
      <div className={`${tip.bgColor} rounded-xl p-6 mb-6 transition-all duration-500`}>
        <div className="flex items-center gap-2 mb-3">
          <tip.icon className={`w-5 h-5 ${tip.color}`} />
          <span className={`font-semibold ${tip.color}`}>{tip.category}</span>
        </div>
        <div className="min-h-[60px]">
          <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
            {typedText}
            <span className="animate-pulse">|</span>
          </p>
        </div>
        <div className="mt-3 flex gap-1">
          {resumeTips.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentTip ? 'w-6 bg-current opacity-100' : 'w-2 bg-current opacity-30'
              } ${tip.color}`}
            />
          ))}
        </div>
      </div>

      {/* 趣味知识 */}
      <div className="bg-gradient-to-r from-pink-50 to-orange-50 dark:from-pink-900/10 dark:to-orange-900/10 rounded-xl p-4 mb-6 border border-pink-100 dark:border-pink-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-800 rounded-lg">
            <Zap className="w-4 h-4 text-pink-600 dark:text-pink-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-pink-600 dark:text-pink-400 font-medium mb-1">
              💡 简历冷知识
            </p>
            <p 
              className={`text-sm text-gray-700 dark:text-gray-300 transition-all duration-500 ${
                showFact ? 'opacity-0 transform translate-y-2' : 'opacity-100'
              }`}
            >
              {funFacts[currentFact]}
            </p>
          </div>
        </div>
      </div>

      {/* 励志名言 */}
      <div className="text-center">
        <Quote className="w-6 h-6 text-gray-300 mx-auto mb-2" />
        <blockquote className="text-gray-600 dark:text-gray-400 italic text-sm mb-2">
          "{quotes[currentQuote].text}"
        </blockquote>
        <cite className="text-xs text-gray-400">
          — {quotes[currentQuote].author}
        </cite>
      </div>

      {/* 底部装饰 */}
      <div className="mt-8 flex justify-center gap-2">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 transition-all duration-300 ${
              i <= (progress / 20) 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-200 dark:text-gray-700'
            }`}
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
};

export default FunLoadingScreen;
