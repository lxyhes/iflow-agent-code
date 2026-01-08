/**
 * ProjectList.jsx - 项目列表组件
 *
 * 显示项目列表，支持选择和操作
 */

import React, { useState } from 'react';
import { FolderOpen, Plus, Search, MoreVertical, Trash2, Edit3, GitBranch } from 'lucide-react';
import { Button, Input } from '../ui';

const ProjectList = ({
  projects,
  selectedProject,
  onProjectSelect,
  onProjectCreate,
  onProjectDelete,
  onProjectEdit,
  projectSortOrder,
  onSortOrderChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(null);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (projectSortOrder) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'size':
        return (b.size || 0) - (a.size || 0);
      default:
        return 0;
    }
  });

  const handleMenuClick = (e, projectId) => {
    e.stopPropagation();
    setShowMenu(showMenu === projectId ? null : projectId);
  };

  const handleDeleteProject = (e, project) => {
    e.stopPropagation();
    if (confirm(`确定要删除项目 "${project.name}" 吗？`)) {
      onProjectDelete(project);
      setShowMenu(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="搜索项目..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 排序选项 */}
      <div className="flex gap-2">
        <select
          value={projectSortOrder}
          onChange={(e) => onSortOrderChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="name">按名称排序</option>
          <option value="date">按日期排序</option>
          <option value="size">按大小排序</option>
        </select>
      </div>

      {/* 创建新项目按钮 */}
      <Button
        onClick={onProjectCreate}
        className="w-full"
        variant="outline"
      >
        <Plus className="w-4 h-4 mr-2" />
        新建项目
      </Button>

      {/* 项目列表 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sortedProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => onProjectSelect(project)}
            className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
              selectedProject?.id === project.id
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {project.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {project.fullPath}
                </p>
                {project.branch && (
                  <div className="flex items-center gap-1 mt-1">
                    <GitBranch className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project.branch}
                    </span>
                  </div>
                )}
              </div>

              {/* 操作菜单 */}
              <div className="relative">
                <button
                  onClick={(e) => handleMenuClick(e, project.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu === project.id && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectEdit(project);
                        setShowMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit3 className="w-3 h-3" />
                      编辑
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project)}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {sortedProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>没有找到项目</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;