/**
 * RAG API 工具函数
 * 用于调用后端的 RAG (Retrieval-Augmented Generation) 功能
 */

const API_BASE = 'http://localhost:8000';

/**
 * 获取 RAG 统计信息
 * @param {string} projectPath - 项目路径
 * @returns {Promise<Object>} 统计信息
 */
export async function getRAGStats(projectPath) {
  const response = await fetch(`${API_BASE}/api/rag/stats/${encodeURIComponent(projectPath)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取 RAG 统计失败');
  }

  return response.json();
}

/**
 * 索引项目到 RAG
 * @param {string} projectPath - 项目路径
 * @param {function} onProgress - 进度回调函数
 * @param {boolean} forceReindex - 是否强制重新索引所有文件
 * @returns {Promise<Object>} 索引结果
 */
export async function indexProjectRAG(projectPath, onProgress, forceReindex = false) {
  const response = await fetch(`${API_BASE}/api/rag/index/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      force_reindex: forceReindex,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'RAG 索引失败');
  }

  // 处理流式响应
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          // SSE 格式: "data: {...}"
          // 需要移除 "data: " 前缀
          const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
          const data = JSON.parse(jsonStr);
          if (onProgress) {
            onProgress(data);
          }
        } catch (e) {
          console.error('解析 RAG 进度数据失败:', e, '原始行:', line);
        }
      }
    }
  }
}

/**
 * 检索相关文档
 * @param {string} projectPath - 项目路径
 * @param {string} query - 查询文本
 * @param {number} nResults - 返回结果数量
 * @param {Object} options - 检索选项
 * @param {number} options.alpha - 语义检索权重 (0-1)，仅对混合检索有效
 * @returns {Promise<Array>} 检索结果
 */
export async function retrieveRAG(projectPath, query, nResults = 5, options = {}) {
  const response = await fetch(`${API_BASE}/api/rag/retrieve/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      n_results: nResults,
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'RAG 检索失败');
  }

  return response.json();
}

/**
 * 重置 RAG 索引
 * @param {string} projectPath - 项目路径
 * @returns {Promise<Object>} 重置结果
 */
export async function resetRAG(projectPath) {
  const response = await fetch(`${API_BASE}/api/rag/reset/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'RAG 重置失败');
  }

  return response.json();
}

/**
 * 上传单个文档到 RAG
 * @param {string} projectPath - 项目路径
 * @param {File} file - 文件对象
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadDocumentToRAG(projectPath, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/rag/upload/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '上传文档失败');
  }

  return response.json();
}

/**
 * 批量上传文档到 RAG
 * @param {string} projectPath - 项目路径
 * @param {FileList} files - 文件列表
 * @param {function} onProgress - 进度回调函数
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadDocumentsBatchToRAG(projectPath, files, onProgress) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const response = await fetch(`${API_BASE}/api/rag/upload-batch/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '批量上传文档失败');
  }

  // 处理流式响应
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() && line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)); // Remove "data: " prefix
          if (onProgress) {
            onProgress(data);
          }
        } catch (e) {
          console.error('解析上传进度数据失败:', e);
        }
      }
    }
  }
}

/**
 * 添加系统文件路径到 RAG（直接读取，不上传）
 * @param {string} projectPath - 项目路径
 * @param {string[]} filePaths - 文件路径列表
 * @param {function} onProgress - 进度回调函数
 * @returns {Promise<Object>} 添加结果
 */
export async function addFilesToRAG(projectPath, filePaths, onProgress) {
  const response = await fetch(`${API_BASE}/api/rag/add-files/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_paths: filePaths }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '添加文件失败');
  }

  // 处理流式响应
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() && line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)); // Remove "data: " prefix
          if (onProgress) {
            onProgress(data);
          }
        } catch (e) {
          console.error('解析添加进度数据失败:', e);
        }
      }
    }
  }
}

/**
 * 向 RAG 知识库提问
 * @param {string} projectPath - 项目路径
 * @param {string} question - 问题
 * @returns {Promise<Object>} 问答结果
 */
export async function askRAG(projectPath, question) {
  const response = await fetch(`${API_BASE}/api/rag/ask/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '问答失败');
  }

  return response.json();
}