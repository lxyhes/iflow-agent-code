/**
 * EmptyState Component
 * 空状态组件（无消息时显示）
 */

import React from 'react';
import IFlowLogo from '../IFlowLogo.jsx';
import CursorLogo from '../CursorLogo.jsx';
import WorkflowTemplateCards from '../workflow/WorkflowTemplateCards';

const EmptyState = ({ provider, selectedProject }) => {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-6">
            {provider === 'cursor' ? (
              <CursorLogo className="h-12 w-12 text-blue-600" />
            ) : (
              <IFlowLogo className="h-12 w-12 text-blue-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {provider === 'cursor' ? 'Cursor Agent' : 'IFlow Agent'}
          </h2>
          <p className="text-gray-500">选择一个模板，或直接开始对话</p>
        </div>

        <div className="mt-8">
          <WorkflowTemplateCards
            limit={6}
            includeCustom={true}
            project={selectedProject}
            title="推荐工作流模板（可复制 JSON）"
          />
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            输入 /workflow 可在聊天中插入更多模板卡片
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
