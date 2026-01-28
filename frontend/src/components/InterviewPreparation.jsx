/**
 * Interview Preparation Component
 * 项目面试准备页面 - 针对选中的项目生成面试问题
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Code2, BrainCircuit, Target, TrendingUp,
  CheckCircle2, Clock, Award, Lightbulb, FileText, FileEdit,
  ChevronRight, PlayCircle, PauseCircle, RefreshCw,
  Sparkles, FolderTree, GitBranch, Database, Globe, MessageSquare, Send,
  Save, Download, History, Mic, MicOff, Timer, Star,
  BarChart3, Zap, AlertCircle, X, Plus, Trash2, Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReactMarkdown from 'react-markdown';

const InterviewPreparation = ({ selectedProject }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // 状态定义
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [currentInterviewId, setCurrentInterviewId] = useState(null);
  const [timer, setTimer] = useState(0);
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [progressTab, setProgressTab] = useState('progress');
  
  const [knowledgePoints, setKnowledgePoints] = useState([
    { id: 1, name: 'JavaScript/TypeScript', category: '前端', progress: 3, total: 10 },
    { id: 2, name: 'React', category: '前端', progress: 5, total: 10 },
    { id: 3, name: '算法与数据结构', category: '基础', progress: 2, total: 10 },
    { id: 4, name: '系统设计', category: '架构', progress: 4, total: 10 },
    { id: 5, name: '数据库', category: '后端', progress: 6, total: 10 },
    { id: 6, name: 'API 设计', category: '后端', progress: 3, total: 10 },
    { id: 7, name: '性能优化', category: '进阶', progress: 1, total: 10 },
    { id: 8, name: '安全', category: '进阶', progress: 2, total: 10 }
  ]);

  // 加载数据
  useEffect(() => {
    const savedHistory = localStorage.getItem('interview_history');
    if (savedHistory) setInterviewHistory(JSON.parse(savedHistory));
    
    const savedKP = localStorage.getItem('interview-knowledge-points');
    if (savedKP) setKnowledgePoints(JSON.parse(savedKP));
  }, []);

  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const saveInterviewRecord = () => {
    if (chatMessages.length === 0) return;
    const record = {
      id: currentInterviewId || Date.now(),
      projectName: selectedProject?.name || 'Unknown',
      date: new Date().toISOString(),
      duration: timer,
      messages: chatMessages
    };
    const updated = [record, ...interviewHistory.filter(h => h.id !== record.id)].slice(0, 50);
    setInterviewHistory(updated);
    localStorage.setItem('interview_history', JSON.stringify(updated));
    alert('记录已保存');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    
    // 模拟 AI 响应
    setTimeout(() => {
      const aiReply = { 
        role: 'ai', 
        content: `针对你的回答，我建议从 ${selectedProject?.name || '项目'} 的实际应用场景出发。你能详细说说你是如何处理并发请求的吗？`, 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      setChatMessages(prev => [...prev, aiReply]);
      setIsChatLoading(false);
    }, 1000);
  };

  // 渲染子组件
  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-3">项目面试实战：{selectedProject?.name}</h2>
        <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
          我们将深度剖析您的代码，模拟大厂面试官的提问视角，助您在面试中脱颖而出。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: '技术深度', icon: Target, color: 'text-blue-500', desc: '分析项目中使用的复杂算法和高级框架特性。' },
          { title: '工程实践', icon: Code2, color: 'text-emerald-500', desc: '考察代码规范、模块化设计及构建流程。' },
          { title: '解决问题', icon: Lightbulb, color: 'text-amber-500', desc: '复盘开发过程中遇到的技术难点及解决方案。' }
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <item.icon className={`w-8 h-8 ${item.color} mb-4`} />
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPractice = () => (
    <div className="flex flex-col h-[600px] bg-gray-50 dark:bg-gray-950 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl">
      <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="font-bold text-gray-700 dark:text-gray-200">模拟面试直播间</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500">
            TIME: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
          </div>
          <button onClick={saveInterviewRecord} className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
            <Save className="w-3.5 h-3.5" /> 保存记录
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold">准备好迎接挑战了吗？</h4>
              <p className="text-gray-500 max-w-sm">点击下方按钮，AI 面试官将根据项目源码开始向你发起提问。</p>
            </div>
            <button 
              onClick={() => {
                const welcomeMsg = { role: 'ai', content: `你好！我是你的 AI 面试官。我已经浏览了项目 **${selectedProject?.name}**。让我们先聊聊你在这个项目中最有成就感的一个技术点吧？`, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
                setChatMessages([welcomeMsg]);
              }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
            >
              进入面试状态
            </button>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none'}`}>
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        {isChatLoading && (
          <div className="flex justify-start items-center gap-3 text-gray-400 text-sm italic">
            <Loader2 className="w-4 h-4 animate-spin" />
            面试官正在记录笔记...
          </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-3">
          <input 
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            placeholder="请详细描述您的回答..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          />
          <button 
            onClick={handleSendMessage}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-90"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistoryList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">面试历程</h3>
        <button 
          onClick={() => { if(confirm('确定清空？')) { localStorage.removeItem('interview_history'); setInterviewHistory([]); } }}
          className="text-sm text-red-500 font-medium hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> 清空全部记录
        </button>
      </div>
      {interviewHistory.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <History className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-gray-400 font-medium">还没有进行过面试，快去“模拟面试”试试吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {interviewHistory.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg group-hover:text-blue-600 transition-colors">{item.projectName}</h4>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" /> {new Date(item.date).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                  {Math.floor(item.duration / 60)} 分钟
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="text-center flex-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">交互轮次</div>
                  <div className="font-bold">{item.messages?.length || 0}</div>
                </div>
                <div className="text-center flex-1 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">综合表现</div>
                  <div className="font-bold text-green-500">优</div>
                </div>
              </div>
              <button 
                onClick={() => { setChatMessages(item.messages); setActiveSection('practice'); }}
                className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 hover:text-white rounded-xl text-sm font-bold transition-all"
              >
                回顾对话内容
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">面试官</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedProject?.name || 'iFlow Agent'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProgressPanel(true)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all relative">
              <BarChart3 className="w-6 h-6 text-purple-500" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>
            <button onClick={() => { setChatMessages([]); setTimer(0); setActiveSection('practice'); }} className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95">
              <Plus className="w-5 h-5" /> 开启新面试
            </button>
          </div>
        </div>
        
        <div className="px-8 flex gap-8 overflow-x-auto no-scrollbar">
          {['overview', 'practice', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={`py-4 text-sm font-bold transition-all border-b-4 ${
                activeSection === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'overview' && '项目分析'}
              {tab === 'practice' && '模拟面试'}
              {tab === 'history' && '历史复盘'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'practice' && renderPractice()}
        {activeSection === 'history' && renderHistoryList()}
      </div>

      {/* 学习进度抽屉 */}
      {showProgressPanel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <h3 className="text-xl font-black">技能图谱</h3>
              </div>
              <button onClick={() => setShowProgressPanel(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              {['progress', 'recommendations', 'analysis'].map(t => (
                <button
                  key={t}
                  onClick={() => setProgressTab(t)}
                  className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
                    progressTab === t ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400'
                  }`}
                >
                  {t === 'progress' ? '掌握度' : t === 'recommendations' ? '智能建议' : '趋势'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
              {progressTab === 'progress' && (
                <div className="space-y-6">
                  {knowledgePoints.map(kp => (
                    <div key={kp.id} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold group-hover:text-purple-500 transition-colors">{kp.name}</span>
                        <span className="text-xs font-mono text-gray-400">{kp.progress}/{kp.total}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${(kp.progress/kp.total)*100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {progressTab === 'recommendations' && (
                <div className="space-y-6">
                  <div className="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-3">
                      <Sparkles className="w-6 h-6" />
                      <span className="font-black text-sm uppercase">AI 进阶建议</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      基于近期的面试表现，你在**系统设计**维度的得分提升最快。下一步建议攻克**前端性能优化**，特别是关键渲染路径的优化。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {['阅读 React 并发机制源码', '完成 3 组算法中等题训练', '复习 WebSocket 协议细节'].map((rec, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-sm font-medium">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {progressTab === 'analysis' && (
                <div className="h-64 space-y-6">
                   <div className="h-48">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...interviewHistory].reverse().slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                          <XAxis dataKey="date" hide />
                          <YAxis fontSize={10} stroke="#999" />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="duration" stroke="#8b5cf6" strokeWidth={4} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                     </ResponsiveContainer>
                   </div>
                   <p className="text-xs text-gray-400 text-center font-bold uppercase tracking-wider">最近 10 场面试时长趋势图</p>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowProgressPanel(false)} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all active:scale-95">
                继续努力
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPreparation;
