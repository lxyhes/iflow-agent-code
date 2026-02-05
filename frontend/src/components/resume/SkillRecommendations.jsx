/**
 * SkillRecommendations - 技能关键词推荐组件
 * 
 * 基于目标职位推荐相关技能
 */

import React, { useState, useMemo } from 'react';
import { 
  Lightbulb, 
  Plus, 
  Sparkles,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// 技能推荐数据库
const SKILL_RECOMMENDATIONS = {
  '前端开发': [
    'React', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 
    'Tailwind CSS', 'Webpack', 'Vite', 'Next.js', 'Redux', 'Node.js'
  ],
  '后端开发': [
    'Java', 'Spring Boot', 'Python', 'Django', 'Flask', 'Go', 'Node.js', 
    'Express', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker'
  ],
  '全栈开发': [
    'React', 'Vue.js', 'Node.js', 'Python', 'Java', 'TypeScript', 'MongoDB', 
    'PostgreSQL', 'Docker', 'AWS', 'Git', 'RESTful API'
  ],
  '移动端开发': [
    'React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 
    'Dart', 'Java', 'Objective-C'
  ],
  '人工智能': [
    'Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 
    'NLP', 'Computer Vision', 'Scikit-learn', 'Pandas', 'NumPy'
  ],
  '数据科学': [
    'Python', 'R', 'SQL', 'Pandas', 'NumPy', 'Matplotlib', 'Tableau', 
    'Machine Learning', 'Statistics', 'Data Visualization'
  ],
  'DevOps': [
    'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'AWS', 'Azure', 
    'Terraform', 'Ansible', 'Linux', 'Shell Script'
  ],
  '产品经理': [
    'Axure', 'Figma', 'Sketch', 'Jira', 'Confluence', '数据分析', 
    '用户研究', '竞品分析', '需求分析', '项目管理'
  ],
  'UI/UX设计': [
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 
    '用户研究', '交互设计', '视觉设计', '原型设计'
  ],
  '测试工程师': [
    'Selenium', 'Appium', 'Jest', 'Cypress', 'Postman', 'JMeter', 
    'Python', 'Java', '自动化测试', '性能测试'
  ],
};

// 通用技能（所有职位都适用）
const COMMON_SKILLS = [
  'Git', 'GitHub', 'GitLab', 'Agile', 'Scrum', 'Jira', 'Confluence',
  'English', '团队协作', '沟通能力', '问题解决', '时间管理'
];

const SkillRecommendations = ({ 
  targetPosition, 
  existingSkills = [], 
  onAddSkill,
  onUpdateTargetPosition 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customPosition, setCustomPosition] = useState('');
  const [showInput, setShowInput] = useState(false);

  // 获取推荐技能
  const recommendations = useMemo(() => {
    const existingSkillNames = existingSkills.map(s => s.name.toLowerCase());
    
    // 查找匹配的技能推荐
    let matchedSkills = [];
    
    if (targetPosition) {
      // 查找最匹配的职位关键词
      for (const [position, skills] of Object.entries(SKILL_RECOMMENDATIONS)) {
        if (targetPosition.toLowerCase().includes(position.toLowerCase()) ||
            position.toLowerCase().includes(targetPosition.toLowerCase())) {
          matchedSkills = [...matchedSkills, ...skills];
        }
      }
    }
    
    // 添加通用技能
    matchedSkills = [...matchedSkills, ...COMMON_SKILLS];
    
    // 去重并过滤已存在的技能
    const uniqueSkills = [...new Set(matchedSkills)];
    return uniqueSkills.filter(skill => 
      !existingSkillNames.includes(skill.toLowerCase())
    ).slice(0, 12); // 最多显示12个
  }, [targetPosition, existingSkills]);

  // 根据目标职位获取建议的职位名称
  const suggestedPositions = useMemo(() => {
    return Object.keys(SKILL_RECOMMENDATIONS);
  }, []);

  const handleAddSkill = (skillName) => {
    if (onAddSkill) {
      onAddSkill({
        name: skillName,
        level: 3,
        category: '技术'
      });
    }
  };

  const handleSetTargetPosition = (position) => {
    if (onUpdateTargetPosition) {
      onUpdateTargetPosition(position);
    }
    setShowInput(false);
    setCustomPosition('');
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
      {/* 头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            AI 技能推荐
          </h3>
          {targetPosition && (
            <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
              {targetPosition}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {/* 目标职位选择 */}
          <div className="mb-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              选择目标职位获取技能推荐：
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPositions.slice(0, 6).map((position) => (
                <button
                  key={position}
                  onClick={() => handleSetTargetPosition(position)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    targetPosition === position
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {position}
                </button>
              ))}
              {!showInput ? (
                <button
                  onClick={() => setShowInput(true)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 transition-colors"
                >
                  + 自定义
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    placeholder="输入职位名称"
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && customPosition.trim()) {
                        handleSetTargetPosition(customPosition.trim());
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => setShowInput(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 推荐技能列表 */}
          {recommendations.length > 0 ? (
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                推荐技能（点击快速添加）：
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendations.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleAddSkill(skill)}
                    className="group flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                  >
                    {skill}
                    <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          ) : targetPosition ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              暂无更多推荐技能，您已添加了大部分相关技能！
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-2">
              <Lightbulb className="w-4 h-4" />
              <span>选择目标职位，获取个性化技能推荐</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillRecommendations;
