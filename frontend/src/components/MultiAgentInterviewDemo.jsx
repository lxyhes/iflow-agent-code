/**
 * 多智能体面试演示组件
 *
 * 展示如何使用 MultiAgentInterview 组件
 */

import React, { useState } from 'react';
import MultiAgentInterview from './MultiAgentInterview';
import { UserPlus, Briefcase, Code2, Award } from 'lucide-react';

/**
 * 候选人信息表单
 */
const CandidateForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skills: '',
    experience_years: '',
    target_position: '',
    current_salary: '',
    expected_salary: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      skills: formData.skills.split(',').map((s) => s.trim()).filter(Boolean),
      experience_years: parseFloat(formData.experience_years) || 0,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-600" />
          候选人信息
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名 *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入邮箱"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              技能 (用逗号分隔) *
            </label>
            <div className="relative">
              <Code2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: Python, React, FastAPI, JavaScript"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工作经验 (年) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标职位 *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.target_position}
                  onChange={(e) => setFormData({ ...formData, target_position: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: 高级软件工程师"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当前薪资
              </label>
              <input
                type="text"
                value={formData.current_salary}
                onChange={(e) => setFormData({ ...formData, current_salary: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 20k"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                期望薪资
              </label>
              <input
                type="text"
                value={formData.expected_salary}
                onChange={(e) => setFormData({ ...formData, expected_salary: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 30k"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <Award className="w-5 h-5" />
              开始面试
            </button>
          </div>
        </form>
      </div>

      {/* 说明 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">面试流程说明</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. 技术面试官将进行技术能力评估（约15-20分钟）</li>
          <li>2. 行为面试官将评估软技能和团队协作能力（约10-15分钟）</li>
          <li>3. HR面试官将了解职业规划和期望（约5-10分钟）</li>
          <li>4. 面试结束后将生成完整的评估报告</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * 多智能体面试演示
 */
const MultiAgentInterviewDemo = () => {
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [interviewConfig] = useState({
    total_rounds: 5,
    max_duration: 3600,
    agent_order: ['technical', 'behavioral', 'hr'],
    enable_follow_up: true,
    enable_stress_test: false,
  });

  const handleCandidateSubmit = (profile) => {
    setCandidateProfile(profile);
  };

  const handleInterviewComplete = (result) => {
    console.log('面试完成:', result);
    // 可以在这里处理面试结果，比如保存到数据库或显示通知
  };

  const handleInterviewCancel = () => {
    setCandidateProfile(null);
  };

  // 如果还没有候选人信息，显示表单
  if (!candidateProfile) {
    return <CandidateForm onSubmit={handleCandidateSubmit} />;
  }

  // 显示面试界面
  return (
    <MultiAgentInterview
      candidateProfile={candidateProfile}
      config={interviewConfig}
      onComplete={handleInterviewComplete}
      onCancel={handleInterviewCancel}
    />
  );
};

export default MultiAgentInterviewDemo;
