/**
 * usePerformanceMonitor.js - 性能监控 Hook
 *
 * 监控虚拟滚动和消息渲染的性能指标
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const usePerformanceMonitor = ({
  enabled = false,
  sampleInterval = 5000 // 采样间隔（毫秒）
}) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollTime: 0,
    messageCount: 0,
    averageRenderTime: 0,
    fps: 0
  });
  const renderTimesRef = useRef([]);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  // 测量渲染时间
  const measureRender = useCallback((callback) => {
    if (!enabled) {
      return callback();
    }

    const startTime = performance.now();
    const result = callback();
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    renderTimesRef.current.push(renderTime);

    // 只保留最近 100 次渲染时间
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }

    setMetrics(prev => ({
      ...prev,
      renderTime,
      averageRenderTime: renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
    }));

    return result;
  }, [enabled]);

  // 测量 FPS
  useEffect(() => {
    if (!enabled) return;

    let animationFrameId;

    const updateFPS = () => {
      const now = performance.now();
      frameCountRef.current++;

      if (now - lastFrameTimeRef.current >= sampleInterval) {
        const fps = Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current));

        setMetrics(prev => ({
          ...prev,
          fps
        }));

        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(updateFPS);
    };

    lastFrameTimeRef.current = performance.now();
    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, sampleInterval]);

  // 重置指标
  const resetMetrics = useCallback(() => {
    renderTimesRef.current = [];
    frameCountRef.current = 0;
    lastFrameTimeRef.current = 0;
    setMetrics({
      renderTime: 0,
      scrollTime: 0,
      messageCount: 0,
      averageRenderTime: 0,
      fps: 0
    });
  }, []);

  // 更新消息数量
  const updateMessageCount = useCallback((count) => {
    setMetrics(prev => ({
      ...prev,
      messageCount: count
    }));
  }, []);

  return {
    metrics,
    measureRender,
    resetMetrics,
    updateMessageCount
  };
};

export default usePerformanceMonitor;