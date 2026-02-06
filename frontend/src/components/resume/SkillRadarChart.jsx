/**
 * SkillRadarChart - 技能雷达图组件
 *
 * 可视化展示技能分布和水平
 */

import React, { useState, useMemo } from 'react';
import {
  Radar,
  Target,
  X,
  Download,
  Settings,
  Plus,
  Trash2,
  Star,
  Zap
} from 'lucide-react';

// 技能分类配置
const SKILL_CATEGORIES = {
  technical: { label: '技术能力', color: '#3B82F6', icon: Zap },
  management: { label: '管理能力', color: '#10B981', icon: Target },
  communication: { label: '沟通能力', color: '#F59E0B', icon: Star },
  language: { label: '语言能力', color: '#8B5CF6', icon: Star },
  tools: { label: '工具使用', color: '#EC4899', icon: Zap }
};

// 默认技能数据示例
const DEFAULT_SKILLS = {
  technical: [
    { name: 'JavaScript', level: 4 },
    { name: 'React', level: 4 },
    { name: 'Node.js', level: 3 },
    { name: 'Python', level: 3 },
    { name: 'SQL', level: 3 }
  ],
  management: [
    { name: '项目管理', level: 3 },
    { name: '团队协作', level: 4 },
    { name: '时间管理', level: 3 }
  ],
  communication: [
    { name: '技术写作', level: 4 },
    { name: '演讲表达', level: 3 },
    { name: '跨部门沟通', level: 4 }
  ],
  language: [
    { name: '英语', level: 4 },
    { name: '普通话', level: 5 }
  ],
  tools: [
    { name: 'Git', level: 4 },
    { name: 'Docker', level: 3 },
    { name: 'AWS', level: 2 },
    { name: 'Figma', level: 3 }
  ]
};

const SkillRadarChart = ({ resume, onClose, onUpdate }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('technical');
  const [skills, setSkills] = useState(() => {
    // 从简历中提取技能，如果没有则使用默认数据
    if (resume.skills && resume.skills.length > 0) {
      return categorizeSkills(resume.skills);
    }
    return DEFAULT_SKILLS;
  });

  // 将技能列表分类
  function categorizeSkills(skillList) {
    const categorized = { ...DEFAULT_SKILLS };
    // 这里可以根据技能名称智能分类
    // 简化处理：将所有技能放入technical分类
    categorized.technical = skillList.map(s => ({
      name: s.name,
      level: s.level || 3
    }));
    return categorized;
  }

  // 计算每个分类的平均分
  const categoryScores = useMemo(() => {
    const scores = {};
    Object.entries(skills).forEach(([category, skillList]) => {
      if (skillList.length > 0) {
        const avg = skillList.reduce((sum, s) => sum + s.level, 0) / skillList.length;
        scores[category] = Math.round(avg * 20); // 转换为百分比
      } else {
        scores[category] = 0;
      }
    });
    return scores;
  }, [skills]);

  // 生成雷达图数据点
  const radarData = useMemo(() => {
    const categories = Object.keys(SKILL_CATEGORIES);
    const data = categories.map(cat => ({
      category: cat,
      label: SKILL_CATEGORIES[cat].label,
      value: categoryScores[cat] || 0,
      color: SKILL_CATEGORIES[cat].color
    }));
    return data;
  }, [categoryScores]);

  // 计算雷达图路径
  const getRadarPath = (data, radius, center) => {
    const angleStep = (Math.PI * 2) / data.length;
    const points = data.map((item, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const value = item.value / 100;
      const x = center + radius * value * Math.cos(angle);
      const y = center + radius * value * Math.sin(angle);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')} Z`;
  };

  // 计算网格线
  const getGridPaths = (radius, center, levels = 5) => {
    const paths = [];
    for (let i = 1; i <= levels; i++) {
      const r = (radius * i) / levels;
      const angleStep = (Math.PI * 2) / Object.keys(SKILL_CATEGORIES).length;
      const points = [];
      for (let j = 0; j < Object.keys(SKILL_CATEGORIES).length; j++) {
        const angle = j * angleStep - Math.PI / 2;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      paths.push(`M ${points.join(' L ')} Z`);
    }
    return paths;
  };

  // 计算轴线
  const getAxisLines = (radius, center, count) => {
    const angleStep = (Math.PI * 2) / count;
    const lines = [];
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      lines.push({ x1: center, y1: center, x2: x, y2: y });
    }
    return lines;
  };

  // 添加技能
  const handleAddSkill = (category, name, level) => {
    setSkills(prev => ({
      ...prev,
      [category]: [...prev[category], { name, level }]
    }));
  };

  // 删除技能
  const handleRemoveSkill = (category, index) => {
    setSkills(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  // 更新技能等级
  const handleUpdateLevel = (category, index, level) => {
    setSkills(prev => ({
      ...prev,
      [category]: prev[category].map((s, i) => i === index ? { ...s, level } : s)
    }));
  };

  // 导出图表
  const handleExport = () => {
    const svg = document.getElementById('skill-radar-chart');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = 400;
        canvas.height = 400;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement('a');
        link.download = '技能雷达图.png';
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const chartSize = 300;
  const center = chartSize / 2;
  const radius = chartSize * 0.35;
  const axisLines = getAxisLines(radius, center, Object.keys(SKILL_CATEGORIES).length);
  const gridPaths = getGridPaths(radius, center);
  const dataPath = getRadarPath(radarData, radius, center);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Radar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                技能雷达图
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                可视化展示技能分布和水平
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="编辑技能"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="导出图片"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* 雷达图 */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative">
                <svg
                  id="skill-radar-chart"
                  width={chartSize}
                  height={chartSize}
                  className="transform hover:scale-105 transition-transform"
                >
                  {/* 背景网格 */}
                  {gridPaths.map((path, index) => (
                    <path
                      key={index}
                      d={path}
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      className="dark:stroke-gray-700"
                    />
                  ))}

                  {/* 轴线 */}
                  {axisLines.map((line, index) => (
                    <line
                      key={index}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="#E5E7EB"
                      strokeWidth="1"
                      className="dark:stroke-gray-700"
                    />
                  ))}

                  {/* 数据区域 */}
                  <path
                    d={dataPath}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    className="dark:fill-blue-500/20 dark:stroke-blue-400"
                  />

                  {/* 数据点 */}
                  {radarData.map((item, index) => {
                    const angle = index * ((Math.PI * 2) / radarData.length) - Math.PI / 2;
                    const value = item.value / 100;
                    const x = center + radius * value * Math.cos(angle);
                    const y = center + radius * value * Math.sin(angle);
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill={item.color}
                        className="hover:r-6 transition-all cursor-pointer"
                      />
                    );
                  })}

                  {/* 标签 */}
                  {radarData.map((item, index) => {
                    const angle = index * ((Math.PI * 2) / radarData.length) - Math.PI / 2;
                    const labelRadius = radius + 30;
                    const x = center + labelRadius * Math.cos(angle);
                    const y = center + labelRadius * Math.sin(angle);
                    return (
                      <text
                        key={index}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium fill-gray-700 dark:fill-gray-300"
                      >
                        {item.label}
                      </text>
                    );
                  })}
                </svg>

                {/* 中心分数 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.values(categoryScores).length)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">综合评分</div>
                  </div>
                </div>
              </div>

              {/* 分类得分 */}
              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm">
                {Object.entries(SKILL_CATEGORIES).map(([key, config]) => {
                  const Icon = config.icon;
                  const score = categoryScores[key] || 0;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{config.label}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{score}分</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 技能编辑区 */}
            {showSettings && (
              <div className="lg:w-80 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  编辑技能
                </h4>

                {/* 分类选择 */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {Object.entries(SKILL_CATEGORIES).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
                        selectedCategory === key
                          ? 'text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === key ? config.color : undefined
                      }}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>

                {/* 技能列表 */}
                <div className="space-y-2 mb-4 max-h-60 overflow-auto">
                  {skills[selectedCategory]?.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-white dark:bg-gray-600 rounded-lg"
                    >
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                        {skill.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleUpdateLevel(selectedCategory, index, star)}
                            className={`w-5 h-5 ${star <= skill.level ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-500'}`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleRemoveSkill(selectedCategory, index)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 添加新技能 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入技能名称"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleAddSkill(selectedCategory, e.target.value.trim(), 3);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      if (input.value.trim()) {
                        handleAddSkill(selectedCategory, input.value.trim(), 3);
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillRadarChart;
