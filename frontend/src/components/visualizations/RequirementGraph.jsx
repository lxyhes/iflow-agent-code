import React, { useState, useMemo } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';

const RequirementGraph = ({ requirements, modules, onNodeClick }) => {
  const nodes = useMemo(() => {
    const requirementNodes = (requirements.keywords || []).map((kw, i) => ({
      id: `req-${i}`,
      type: 'input',
      data: { label: kw },
      position: { x: 250, y: i * 100 },
      style: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: '8px' }
    }));

    const moduleNodes = (modules || []).map((mod, i) => ({
      id: `mod-${i}`,
      type: 'output',
      data: { 
        label: (
          <div onClick={() => onNodeClick && onNodeClick(mod.path)} className="cursor-pointer">
            <div className="font-bold">{mod.path}</div>
            <div className="text-xs text-gray-500">{mod.reason}</div>
          </div>
        )
      },
      position: { x: 600, y: i * 150 },
      style: { background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', width: 250 }
    }));

    return [...requirementNodes, ...moduleNodes];
  }, [requirements, modules, onNodeClick]);

  const edges = useMemo(() => {
    const edgeList = [];
    (requirements.keywords || []).forEach((kw, i) => {
      (modules || []).forEach((mod, j) => {
        // Simple heuristic: connect all keywords to all modules for now
        // In a real app, we would have specific keyword-module mappings
        if (mod.reason && mod.reason.toLowerCase().includes(kw.toLowerCase())) {
           edgeList.push({
            id: `e-${i}-${j}`,
            source: `req-${i}`,
            target: `mod-${j}`,
            animated: true,
            style: { stroke: '#3b82f6' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          });
        }
      });
    });
    
    // Fallback if no specific connections found
    if (edgeList.length === 0 && modules?.length > 0) {
       (requirements.keywords || []).forEach((kw, i) => {
          edgeList.push({
            id: `e-default-${i}`,
            source: `req-${i}`,
            target: `mod-0`,
            animated: true,
            style: { stroke: '#e5e7eb' },
          });
       });
    }

    return edgeList;
  }, [requirements, modules]);

  return (
    <div className="h-[600px] w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default RequirementGraph;
