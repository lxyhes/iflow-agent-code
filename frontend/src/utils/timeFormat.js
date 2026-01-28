/**
 * 时间格式化工具
 * 提供相对时间和格式化时间显示
 */

/**
 * 格式化为相对时间
 * @param {Date|string|number} date - 日期对象、时间字符串或时间戳
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) {
    return '刚刚';
  } else if (diffSec < 60) {
    return `${diffSec}秒前`;
  } else if (diffMin < 60) {
    return `${diffMin}分钟前`;
  } else if (diffHour < 24) {
    return `${diffHour}小时前`;
  } else if (diffDay < 7) {
    return `${diffDay}天前`;
  } else {
    return target.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * 格式化时间为 HH:mm
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatTime(date) {
  const target = new Date(date);
  return target.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 格式化完整日期时间
 * @param {Date|string|number} date 
 * @returns {string}
 */
export function formatDateTime(date) {
  const target = new Date(date);
  const now = new Date();
  const isToday = target.toDateString() === now.toDateString();
  
  if (isToday) {
    return `今天 ${formatTime(target)}`;
  }
  
  return target.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 格式化持续时间
 * @param {number} ms - 毫秒数
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}分${sec}秒`;
  }
}

export default {
  formatRelativeTime,
  formatTime,
  formatDateTime,
  formatDuration
};
