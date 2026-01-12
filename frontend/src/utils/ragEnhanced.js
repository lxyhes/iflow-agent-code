/**
 * RAG 增强功能 API 工具函数
 * 包含文档版本管理、高级检索等功能的 API 调用
 */

const API_BASE = 'http://localhost:8000';

/**
 * 获取文档的所有版本
 */
export async function getDocumentVersions(projectPath, filePath) {
  const response = await fetch(`${API_BASE}/api/document-versions/${encodeURIComponent(projectPath)}/${encodeURIComponent(filePath)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取文档版本失败');
  }

  return response.json();
}

/**
 * 获取特定版本的文档内容
 */
export async function getDocumentVersion(projectPath, filePath, versionId) {
  const response = await fetch(`${API_BASE}/api/document-versions/${encodeURIComponent(projectPath)}/${encodeURIComponent(filePath)}/${versionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取文档版本失败');
  }

  return response.json();
}

/**
 * 记录文档版本
 */
export async function recordDocumentVersion(projectPath, filePath, metadata = {}) {
  const response = await fetch(`${API_BASE}/api/document-versions/${encodeURIComponent(projectPath)}/${encodeURIComponent(filePath)}/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '记录文档版本失败');
  }

  return response.json();
}

/**
 * 比较两个文档版本
 */
export async function compareDocumentVersions(projectPath, filePath, versionId1, versionId2) {
  const response = await fetch(`${API_BASE}/api/document-versions/${encodeURIComponent(projectPath)}/${encodeURIComponent(filePath)}/compare/${versionId1}/${versionId2}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '比较文档版本失败');
  }

  return response.json();
}

/**
 * 删除特定版本
 */
export async function deleteDocumentVersion(projectPath, filePath, versionId) {
  const response = await fetch(`${API_BASE}/api/document-versions/${encodeURIComponent(projectPath)}/${encodeURIComponent(filePath)}/${versionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '删除文档版本失败');
  }

  return response.json();
}

/**
 * 获取版本统计信息
 */
export async function getVersionStatistics(projectPath) {
  const response = await fetch(`${API_BASE}/api/document-versions/${encodeURIComponent(projectPath)}/statistics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取版本统计失败');
  }

  return response.json();
}

/**
 * 高级检索（带过滤和排序）
 */
export async function retrieveRAGAdvanced(projectPath, query, options = {}) {
  const response = await fetch(`${API_BASE}/api/rag/retrieve/${encodeURIComponent(projectPath)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      n_results: options.nResults || 5,
      similarity_threshold: options.similarityThreshold || 0.0,
      file_types: options.fileTypes || [],
      languages: options.languages || [],
      min_chunk_size: options.minChunkSize || 0,
      max_chunk_size: options.maxChunkSize || Infinity,
      sort_by: options.sortBy || 'similarity',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'RAG 检索失败');
  }

  return response.json();
}