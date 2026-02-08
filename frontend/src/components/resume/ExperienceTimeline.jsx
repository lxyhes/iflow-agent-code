/**
 * ExperienceTimeline - 工作经历时间轴组件
 *
 * 时间线形式展示职业路径
 */

import React, { useState, useMemo } from 'react';
import {
  History,
  X,
  Calendar,
  Briefcase,
  Award,
  TrendingUp,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  Download,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

const ExperienceTimeline = ({ resume, onClose }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showAchievements, setShowAchievements] = useState(true);

  // 处理工作经历数据
  const timelineData = useMemo(() => {
    if (!resume.workExperiences || resume.workExperiences.length === 0) {
      return [];
    }

    // 按开始时间排序（最新的在前）
    const sorted = [...resume.workExperiences].sort((a, b) => {
      const dateA = new Date(a.startDate || '2000-01-01');
      const dateB = new Date(b.startDate || '2000-01-01');
      return dateB - dateA;
    });

    // 计算每段工作的时长
    return sorted.map((exp, index) => {
      const startDate = new Date(exp.startDate || '2000-01-01');
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();

      const diffTime = Math.abs(endDate - startDate);
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

      let duration = '';
      if (diffYears > 0) duration += `${diffYears}年`;
      if (diffMonths > 0) duration += `${diffMonths}个月`;
      if (duration === '') duration = '不足1个月';

      // 提取关键成就（包含数字的描述）
      const achievements = [];
      if (exp.description) {
        const sentences = exp.description.split(/[。！.!]/);
        sentences.forEach(sentence => {
          if (/\d+/.test(sentence) && sentence.length > 10) {
            achievements.push(sentence.trim());
          }
        });
      }
      if (exp.achievements) {
        exp.achievements.forEach(ach => {
          if (!achievements.includes(ach)) {
            achievements.push(ach);
          }
        });
      }

      return {
        ...exp,
        duration,
        durationMonths: diffYears * 12 + diffMonths,
        achievements: achievements.slice(0, 3), // 最多显示3个成就
        isCurrent: !exp.endDate,
        index
      };
    });
  }, [resume.workExperiences]);

  // 计算总工作年限
  const totalExperience = useMemo(() => {
    if (timelineData.length === 0) return 0;

    const earliest = new Date(timelineData[timelineData.length - 1].startDate);
    const latest = timelineData[0].endDate ? new Date(timelineData[0].endDate) : new Date();
    const diffYears = (latest - earliest) / (1000 * 60 * 60 * 24 * 365);
    return Math.round(diffYears);
  }, [timelineData]);

  // 切换展开状态
  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '至今';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // 获取时间轴颜色
  const getTimelineColor = (index) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  if (timelineData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            暂无工作经历
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            请先添加工作经历，时间轴将自动展示您的职业路径
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                职业时间轴
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {totalExperience}年工作经验 · {timelineData.length}段工作经历
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 缩放控制 */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* 显示成就切换 */}
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className={`p-2 rounded-lg transition-colors ${
                showAchievements
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="显示成就"
            >
              <Award className="w-5 h-5" />
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
          <div 
            className="relative"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            {/* 时间轴线 */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

            {/* 时间轴项目 */}
            <div className="space-y-6">
              {timelineData.map((item, index) => {
                const isExpanded = expandedItems.has(item.id);
                const colorClass = getTimelineColor(index);

                return (
                  <div key={item.id} className="relative flex gap-4">
                    {/* 时间点 */}
                    <div className="relative z-10">
                      <div className={`w-16 h-16 rounded-full ${colorClass} flex items-center justify-center shadow-lg`}>
                        <Briefcase className="w-7 h-7 text-white" />
                      </div>
                      {item.isCurrent && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* 内容卡片 */}
                    <div className="flex-1 pt-2">
                      <div 
                        className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                          isExpanded ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => toggleExpand(item.id)}
                      >
                        {/* 头部信息 */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {item.position}
                              </h4>
                              {item.isCurrent && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
                                  在职
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {item.company}
                            </p>
                            
                            {/* 元信息 */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(item.startDate)} - {formatDate(item.endDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {item.duration}
                              </span>
                              {item.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {item.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {/* 展开详情 */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                            {/* 工作描述 */}
                            {item.description && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  工作描述
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            )}

                            {/* 关键成就 */}
                            {showAchievements && item.achievements.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                  <Award className="w-4 h-4 text-yellow-500" />
                                  关键成就
                                </h5>
                                <ul className="space-y-2">
                                  {item.achievements.map((achievement, idx) => (
                                    <li 
                                      key={idx}
                                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                                    >
                                      <Star className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                      <span>{achievement}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 时长指示器 */}
                      <div className="mt-2 ml-4 flex items-center gap-2">
                        <div 
                          className={`h-1 rounded-full ${colorClass}`}
                          style={{ 
                            width: `${Math.min(200, item.durationMonths * 5)}px`,
                            opacity: 0.6 
                          }}
                        />
                        <span className="text-xs text-gray-400">
                          {item.durationMonths}个月
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 时间轴底部 */}
            <div className="relative flex gap-4 mt-6">
              <div className="w-16 flex justify-center">
                <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>
              <div className="flex-1 pb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  职业起点
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                平均在职时长: {Math.round(timelineData.reduce((sum, item) => sum + item.durationMonths, 0) / timelineData.length)}个月
              </span>
            </div>
            <button
              onClick={() => {
                // 导出时间轴为图片
                console.log('导出时间轴');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              导出时间轴
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceTimeline;
