/**
 * 面试高手助手 - 可复用组件
 * 
 * 在任意面试模式中提供帮助，生成满分答案
 */

import React, { useState } from 'react';
import { Crown, Sparkles, X, Lightbulb, Copy, CheckCircle2 } from 'lucide-react';
import MarkdownRenderer from './markdown/MarkdownRenderer';

const InterviewMasterHelper = ({ 
  isOpen, 
  onClose, 
  question, 
  context = '', 
  questionType = 'technical' 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [masterAnswer, setMasterAnswer] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateMasterAnswer = async () => {
    if (!question) return;
    
    setIsGenerating(true);
    
    // 模拟AI生成满分答案
    await new Promise(resolve => setTimeout(resolve, 2000));

    let answer = '';

    if (questionType === 'technical') {
      answer = `【面试高手满分答案】

**问题分析：**
这是一个典型的技术深度问题，考察你对底层原理的理解和实际应用能力。

**满分回答结构：**

**1. 概念定义（20分）**
首先，我们需要明确...（用一句话精确定义核心概念）

**2. 底层原理（30分）**
从底层实现来看，它的工作原理是...（详细解释机制，展示技术深度）

**3. 实际应用（25分）**
在实际项目中，我曾经遇到过类似的场景...（结合真实项目案例）

**4. 优缺点分析（15分）**
这个方案的优点是...，但也存在...的局限性。在选择时需要权衡...（体现全面思考）

**5. 延伸拓展（10分）**
相关的技术还有...，它们之间的区别是...（展示技术广度）

**加分话术：**
- "这个问题的核心在于..."
- "在实际应用中，我们需要考虑..."
- "从架构设计的角度来看..."
- "如果让我来设计，我会..."

**注意事项：**
- 回答要有条理，分点说明
- 结合具体数字和案例
- 主动提及性能、安全、扩展性
- 保持自信但谦虚的态度`;
    } else if (questionType === 'behavioral') {
      answer = `【STAR法则满分答案】

**情境（Situation）：**
在2023年上半年，我们团队负责开发一个新的电商平台，项目周期只有3个月，时间非常紧张。当时我们面临着技术选型不确定、团队人员不足的双重压力。

**任务（Task）：**
作为后端技术负责人，我的核心任务是：
1. 设计高可用的系统架构
2. 确保系统能支撑每秒10万QPS
3. 带领5人团队按时交付

**行动（Action）：**
我采取了以下关键行动：
1. **技术调研**：用1周时间对比了3种架构方案，最终选择了微服务+消息队列的方案
2. **性能优化**：引入Redis缓存，数据库读写分离，接口响应时间从500ms降到50ms
3. **团队协作**：建立每日站会制度，使用Git Flow规范代码管理
4. **风险管控**：提前识别3个技术风险点，制定应急预案

**结果（Result）：**
- 系统按时上线，零故障运行
- 性能超出预期，支撑了12万QPS
- 获得团队优秀项目奖
- 个人获得年度优秀员工

**反思（Reflection）：**
通过这次经历，我学到了：
1. 前期技术调研的重要性
2. 团队协作比个人英雄主义更重要
3. 风险预判和应急预案的必要性

如果重来一次，我会在需求阶段花更多时间，避免后期的需求变更。`;
    } else if (questionType === 'systemDesign') {
      answer = `【系统设计满分答案】

**第一步：需求分析（10分）**
在设计之前，我需要明确几个关键需求：
- 功能需求：核心功能是什么？
- 非功能需求：QPS、延迟、可用性要求
- 数据规模：日活用户、数据存储量

假设这是一个日活1000万的社交App，核心功能是发布动态和点赞评论。

**第二步：容量估算（15分）**
- 日活：1000万
- 峰值QPS：10万（按日活的1%估算）
- 数据量：每天新增1000万条动态，每条1KB，约10GB/天
- 存储：3年约10TB

**第三步：API设计（15分）**
- POST /api/posts - 发布动态
- GET /api/posts/:id - 获取动态详情
- POST /api/posts/:id/like - 点赞
- GET /api/posts/feed - 获取feed流

**第四步：数据模型（15分）**
- User表：用户基本信息
- Post表：动态内容、作者、时间
- Like表：点赞关系
- Follow表：关注关系

使用MySQL存储关系数据，Redis缓存热点数据，MongoDB存储动态内容。

**第五步：架构设计（25分）**
- 接入层：Nginx负载均衡
- 应用层：微服务架构，拆分用户服务、动态服务、feed服务
- 数据层：MySQL主从复制，Redis集群
- 消息队列：Kafka处理异步任务

**第六步：关键问题解决（15分）**
1. **高并发**：读写分离+缓存+限流
2. **Feed流**：推拉结合，活跃用户推，普通用户拉
3. **热点数据**：本地缓存+Redis分布式缓存
4. **高可用**：多机房部署，自动故障转移

**第七步：扩展性（5分）**
- 支持水平扩展
- 未来可以接入推荐算法
- 支持多地域部署`;
    } else if (questionType === 'salary') {
      answer = `【薪资谈判满分话术】

**第一步：了解薪资结构（20分）**
"在谈具体数字之前，我想先了解一下咱们公司的薪资结构，包括基本工资、年终奖、股票期权、签字费、搬家补贴等各个组成部分。"

**第二步：展示价值（30分）**
"基于我的经验和技能，我相信我能为公司带来以下价值：
1. 我有5年后端开发经验，熟悉高并发系统设计
2. 在上一家公司主导过3个核心项目，都取得了很好的业绩
3. 我擅长技术选型和团队管理，能帮助团队提升效率"

**第三步：给出合理期望（25分）**
"根据我的市场调研，这个职位的合理薪资范围是40-60万。考虑到我的经验和能力，以及我对这个职位的热情，我的期望是50万左右。当然，我更看重整体package和长期发展。"

**第四步：强调综合价值（15分）**
"除了薪资，我也很看重：
1. 技术成长空间和学习机会
2. 团队氛围和公司文化
3. 业务发展前景
4. 股票期权的长期价值

我相信贵公司在这些方面都很有优势。"

**第五步：灵活应对（10分）**
"当然，具体数字我们可以再商量。如果整体package有竞争力，我也愿意在基本工资上做一些让步。我更看重的是能加入一个优秀的团队，一起做出有价值的产品。"

**谈判技巧：**
- 不要首先提出具体数字
- 给出一个范围而不是固定值
- 强调整体package，不只是基本工资
- 表达加入公司的强烈意愿
- 给自己留谈判空间`;
    }

    setMasterAnswer(answer);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    if (masterAnswer) {
      navigator.clipboard.writeText(masterAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                面试高手助手
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-gray-500">为你生成满分答案</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 问题显示 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm text-blue-700 dark:text-blue-300">当前问题</span>
            </div>
            <p className="text-gray-800 dark:text-gray-200">{question || '暂无问题'}</p>
          </div>

          {!masterAnswer ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                需要面试高手的帮助吗？
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                点击下方的按钮，面试高手会为你生成一份满分答案，包括回答结构、话术示例和加分技巧。
              </p>
              <button
                onClick={generateMasterAnswer}
                disabled={isGenerating || !question}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto font-medium"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    面试高手思考中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    生成满分答案
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              {/* 满分答案 */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-gray-900 dark:text-white">满分答案</span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      复制答案
                    </>
                  )}
                </button>
              </div>
              
              <div className="p-5 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-700">
                <MarkdownRenderer className="prose prose-sm max-w-none">
                  {masterAnswer}
                </MarkdownRenderer>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setMasterAnswer(null)}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  重新生成
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-colors"
                >
                  我知道了
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewMasterHelper;
