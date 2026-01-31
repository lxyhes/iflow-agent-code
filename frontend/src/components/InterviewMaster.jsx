/**
 * 面试高手模式
 *
 * 全能型面试辅助功能，帮助用户在任何面试中都能表现出色
 * 无论去什么公司，无论什么面试题，都能让面试官满意
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Crown, MessageSquare, Send, Bot, User, Sparkles, Target,
  Zap, Star, TrendingUp, Award, CheckCircle2, Lightbulb,
  BookOpen, Briefcase, Code, Brain, Heart
} from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';

const InterviewMaster = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '你好！我是你的面试高手助手。无论你去什么公司，面对什么面试题，我都会帮你给出最满意的回答。\n\n请告诉我：\n1. 你要面试的公司（如：阿里巴巴、字节跳动等）\n2. 你要面试的职位（如：后端开发、架构师等）\n3. 面试官问了什么问题？',
      type: 'welcome'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [interviewStage, setInterviewStage] = useState('intro'); // intro, analyzing, answering, followup
  const [answerStrategy, setAnswerStrategy] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 面试高手策略库
  const masterStrategies = {
    // 技术问题回答框架
    technical: {
      framework: [
        '【概念定义】先用一句话定义核心概念',
        '【原理阐述】解释底层原理，展示深度',
        '【实际应用】结合项目经验说明应用场景',
        '【优缺点分析】客观分析优缺点，体现思考',
        '【延伸拓展】提及相关技术，展示广度'
      ],
      tips: [
        '不要只讲理论，一定要有实际案例',
        '主动提及性能、安全、扩展性等维度',
        '适当使用专业术语，但不要过度',
        '如果不知道，诚实承认但表达学习意愿'
      ]
    },
    // 行为问题回答框架 (STAR法则增强版)
    behavioral: {
      framework: [
        '【背景】一句话说明项目背景和挑战',
        '【任务】明确你的职责和目标',
        '【行动】详细描述你采取的行动（重点）',
        '【结果】用数据量化成果',
        '【反思】总结收获和可以改进的地方'
      ],
      tips: [
        '强调"我"而不是"我们"',
        '突出困难和你如何解决',
        '用具体数字说话',
        '展现成长和反思能力'
      ]
    },
    // 系统设计问题框架
    systemDesign: {
      framework: [
        '【需求分析】明确功能需求和非功能需求',
        '【容量估算】估算QPS、数据量、存储',
        '【API设计】设计核心API接口',
        '【数据模型】设计数据库和缓存结构',
        '【架构图】画出系统架构图',
        '【关键问题】解决高并发、高可用等核心问题',
        '【扩展性】讨论如何支持未来扩展'
      ],
      tips: [
        '先问清楚需求再设计',
        '从整体到局部，逐步细化',
        '主动提及监控、告警、容灾',
        '考虑成本和实现复杂度'
      ]
    },
    // 薪资谈判框架
    salary: {
      framework: [
        '【市场调研】了解该职位市场薪资范围',
        '【价值展示】强调你能为公司带来的价值',
        '【整体Package】考虑股票、期权、福利等',
        '【灵活谈判】给出合理范围而不是固定数字',
        '【长期发展】强调成长机会和学习空间'
      ],
      tips: [
        '不要首先提出具体数字',
        '用数据支撑你的期望',
        '表达加入公司的强烈意愿',
        '给自己留谈判空间'
      ]
    }
  };

  // 识别问题类型
  const identifyQuestionType = (question) => {
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes('设计') && (lowerQ.includes('系统') || lowerQ.includes('架构'))) {
      return 'systemDesign';
    }
    if (lowerQ.includes('薪资') || lowerQ.includes('待遇') || lowerQ.includes('期望')) {
      return 'salary';
    }
    if (lowerQ.includes('项目') || lowerQ.includes('经历') || lowerQ.includes('挑战') ||
        lowerQ.includes('冲突') || lowerQ.includes('困难') || lowerQ.includes('成就')) {
      return 'behavioral';
    }
    return 'technical';
  };

  // 生成高手级回答
  const generateMasterAnswer = async (question, type, company, position) => {
    setIsLoading(true);

    // 模拟AI思考
    await new Promise(resolve => setTimeout(resolve, 2000));

    const strategy = masterStrategies[type];
    let answer = '';

    // 根据公司调整风格
    const companyStyle = {
      '阿里': '重视技术深度和架构设计能力',
      '字节': '重视算法和快速迭代能力',
      '腾讯': '重视基础扎实和团队协作',
      '美团': '重视业务理解和系统稳定性',
      '百度': '重视技术深度和创新能力',
      '京东': '重视高并发和电商经验',
      '拼多多': '重视极致性能和成本控制',
      '小米': '重视全栈能力和产品思维'
    };

    const style = companyStyle[company] || '综合技术能力和项目经验';

    if (type === 'technical') {
      answer = `【面试高手回答策略】针对${company}的面试风格（${style}）：

**回答框架：**
${strategy.framework.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**针对这个问题的高分回答思路：**
1. **先定义概念** - 展示你对基础概念的理解
2. **深入原理** - 讲解底层实现机制，体现技术深度
3. **结合实际** - 用你项目中的真实案例说明
4. **对比分析** - 与其他方案对比，说明选型原因
5. **性能优化** - 主动提及性能考虑和优化手段

**加分技巧：**
${strategy.tips.map((t, i) => `• ${t}`).join('\n')}

**话术示例：**
"关于这个问题，我的理解是...（定义）。在实际项目中，我遇到过一个类似的场景...（案例）。当时我们考虑到...（思考过程），最终选择了...（决策）。这个方案的优点是...，但也存在...的局限。如果让我重新设计，我会...（反思）。"`;
    } else if (type === 'behavioral') {
      answer = `【STAR法则增强版】这是${company}最喜欢问的行为面试题：

**回答框架：**
${strategy.framework.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**高分回答模板：**
"在[时间]，我负责[项目背景]。当时面临的最大挑战是[困难描述]，因为[原因分析]。

我的任务是[具体目标]。为了达成这个目标，我采取了以下行动：
1. [行动1 - 体现技术能力]
2. [行动2 - 体现解决问题能力]
3. [行动3 - 体现团队协作]

最终结果是[数据量化成果]，比如性能提升了X%，节省了X时间，获得了X认可。

通过这次经历，我学到了[收获]。如果重来一次，我会在[改进点]做得更好。"`
    } else if (type === 'systemDesign') {
      answer = `【系统设计高分策略】${company}非常重视系统设计能力：

**回答框架（按这个顺序）：**
${strategy.framework.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**关键要点：**
• **先问需求** - 不要急着设计，先问清楚功能需求、QPS、数据量
• **逐步细化** - 从整体架构到具体模块，层层深入
• **主动提及** - 高可用、高并发、监控、容灾、扩展性
• **数据支撑** - 给出具体的数字估算

**话术示例：**
"在设计这个系统之前，我想先确认几个关键需求：1）预期的QPS是多少？2）数据量级别？3）可用性要求？

基于这些需求，我的设计思路是...（整体架构）。核心模块包括...（模块划分）。

对于高并发场景，我会采用...（解决方案）。为了保证高可用，我会...（容灾方案）。

这个方案可以支撑...（容量），未来可以通过...（扩展方案）来支持业务增长。"`;
    } else if (type === 'salary') {
      answer = `【薪资谈判高手策略】与${company}HR谈判的技巧：

**谈判框架：**
${strategy.framework.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**谈判话术：**
1. **开场** - "在谈薪资之前，我想先了解一下这个职位的薪资结构，包括基本工资、年终奖、股票期权等"

2. **展示价值** - "基于我的经验和技能，我相信我能为公司带来以下价值...（列举2-3点）"

3. **给出范围** - "根据我的市场调研，这个职位的合理范围是X-Y。考虑到我的经验和能力，我希望能在X+20%左右"

4. **强调整体** - "除了薪资，我也很看重成长机会、技术挑战和团队氛围。我相信${company}在这些方面都很有优势"

5. **灵活应对** - "当然，具体数字我们可以再商量。我更看重长期的职业发展和学习机会"

**注意事项：**
${strategy.tips.map((t, i) => `• ${t}`).join('\n')}`;
    }

    setAnswerStrategy({
      type,
      framework: strategy.framework,
      tips: strategy.tips,
      answer
    });

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: answer,
      type: 'strategy'
    }]);

    setIsLoading(false);
    setInterviewStage('answering');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');

    // 提取公司和职位信息
    if (interviewStage === 'intro') {
      // 尝试从用户输入中提取公司和职位
      const companyMatch = userMessage.match(/(阿里|字节|腾讯|美团|百度|京东|拼多多|小米|华为|滴滴|快手|网易)/);
      const positionMatch = userMessage.match(/(后端|前端|架构师|算法|测试|运维|产品|运营)/);

      if (companyMatch) setCompany(companyMatch[1]);
      if (positionMatch) setPosition(positionMatch[1]);

      // 检查是否包含面试题
      const hasQuestion = userMessage.includes('？') || userMessage.includes('?') ||
                         userMessage.length > 20;

      if (hasQuestion) {
        setInterviewStage('analyzing');
        const questionType = identifyQuestionType(userMessage);
        await generateMasterAnswer(userMessage, questionType, companyMatch?.[1] || '互联网公司', positionMatch?.[1] || '开发');
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `好的，我了解到你要面试${companyMatch?.[1] || '互联网公司'}的${positionMatch?.[1] || '技术'}职位。\n\n现在请告诉我面试官问了什么问题？我会用最高手的回答策略帮你！`,
          type: 'normal'
        }]);
      }
    } else {
      // 继续对话
      setInterviewStage('analyzing');
      const questionType = identifyQuestionType(userMessage);
      await generateMasterAnswer(userMessage, questionType, company || '互联网公司', position || '开发');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                面试高手模式
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </h3>
              <p className="text-sm text-gray-500">
                {company && position
                  ? `为你定制 ${company} ${position} 的高分回答策略`
                  : '无论什么公司，什么题目，都能让面试官满意'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <span className="text-gray-500 text-xl">✕</span>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 聊天区域 */}
          <div className="flex-1 flex flex-col">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-br from-amber-400 to-yellow-500'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Crown className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[75%] p-4 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : msg.type === 'strategy'
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-200 dark:border-amber-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }`}>
                    {msg.type === 'strategy' && (
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <span className="font-bold text-amber-700 dark:text-amber-300">面试高手策略</span>
                      </div>
                    )}
                    <MarkdownRenderer className="prose prose-sm max-w-none">
                      {msg.content}
                    </MarkdownRenderer>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-600">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">面试高手正在分析最优策略...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={interviewStage === 'intro'
                    ? "告诉我：公司 + 职位 + 面试题"
                    : "继续输入面试题，我会帮你给出完美回答..."
                  }
                  className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none h-24"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 侧边栏 - 面试高手秘籍 */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-b from-amber-50/50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold text-gray-900 dark:text-white">面试高手秘籍</h4>
            </div>

            <div className="space-y-4">
              {/* 当前状态 */}
              {(company || position) && (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-sm">当前目标</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {company && <div className="text-gray-700 dark:text-gray-300">🏢 {company}</div>}
                    {position && <div className="text-gray-700 dark:text-gray-300">💼 {position}</div>}
                  </div>
                </div>
              )}

              {/* 万能回答框架 */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">万能回答框架</span>
                </div>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                    <span><b>定义概念</b> - 一句话说清是什么</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                    <span><b>深入原理</b> - 讲底层机制</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                    <span><b>结合实际</b> - 项目案例</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">4</span>
                    <span><b>优缺点</b> - 客观分析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">5</span>
                    <span><b>延伸拓展</b> - 展示广度</span>
                  </li>
                </ul>
              </div>

              {/* 加分技巧 */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">加分技巧</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    用数据说话，避免空泛
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    主动提及性能、安全、扩展
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    展示技术选型的思考过程
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    适当承认不足，体现诚实
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    保持眼神交流和微笑
                  </li>
                </ul>
              </div>

              {/* 常见问题类型 */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-sm">我能帮你回答</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['技术问题', '项目经历', '系统设计', '算法题', '薪资谈判', '行为面试', '职业规划', '离职原因'].map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 心态提醒 */}
              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-sm text-green-800 dark:text-green-200">心态调整</span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  面试是双向选择，你也在评估公司。保持自信、真诚、专业的态度，你就是最棒的！
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewMaster;
