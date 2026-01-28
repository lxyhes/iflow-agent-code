"""
RAG Router
RAG（检索增强生成）相关的 API 路由
"""

import os
import json
import logging
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse

from backend.core.rag_service import get_rag_service, CHROMADB_AVAILABLE, SKLEARN_AVAILABLE, SENTENCE_TRANSFORMERS_AVAILABLE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/rag", tags=["RAG"])

# RAG 服务缓存
rag_cache = {}


# ============================================
# RAG 端点
# ============================================

@router.get("/stats")
async def get_rag_stats(project_path: str = None, project_name: str = None):
    """获取 RAG 统计信息"""
    try:
        # 优先使用 project_path，如果没有则使用 project_name
        if project_path:
            final_project_path = project_path
        elif project_name:
            final_project_path = _get_project_path(project_name)
        else:
            return JSONResponse(
                content={"error": "缺少 project_path 或 project_name 参数"},
                status_code=400
            )

        if final_project_path not in rag_cache:
            rag_cache[final_project_path] = get_rag_service(final_project_path)

        rag_service = rag_cache[final_project_path]
        stats = rag_service.get_stats()

        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.exception(f"获取 RAG 统计失败: {e}")
        return JSONResponse(
            content={"error": f"获取 RAG 统计失败: {str(e)}"},
            status_code=500
        )


@router.get("/status")
async def get_rag_status():
    """获取 RAG 依赖状态"""
    try:
        return {
            "success": True,
            "dependencies": {
                "chromadb": CHROMADB_AVAILABLE,
                "sentence_transformers": SENTENCE_TRANSFORMERS_AVAILABLE,
                "sklearn": SKLEARN_AVAILABLE
            },
            "current_mode": "tfidf",  # TODO: 从 global_config 读取
            "available_retrievers": []
        }
    except Exception as e:
        logger.exception(f"获取 RAG 状态失败: {e}")
        return JSONResponse(
            content={"error": f"获取 RAG 状态失败: {str(e)}"},
            status_code=500
        )


@router.post("/index")
async def index_project_rag(request: Request, project_path: str = None, project_name: str = None):
    """索引项目文档到 RAG（支持增量索引）"""
    try:
        # 优先使用 project_path，如果没有则使用 project_name
        if project_path:
            final_project_path = project_path
            logger.info(f"RAG indexing request for project_path: {project_path}")
        elif project_name:
            final_project_path = _get_project_path(project_name)
            logger.info(f"RAG indexing request for project_name: {project_name}, path: {final_project_path}")
        else:
            return JSONResponse(
                content={"error": "缺少 project_path 或 project_name 参数"},
                status_code=400
            )

        logger.info(f"RAG indexing request for project: {final_project_path}")

        # 解析请求参数
        try:
            data = await request.json() if request.method == "POST" else {}
            force_reindex = data.get("force_reindex", False)
        except Exception as e:
            logger.warning(f"Failed to parse request JSON: {e}")
            data = {}
            force_reindex = False

        # 检查依赖
        if not CHROMADB_AVAILABLE and not SKLEARN_AVAILABLE:
            error_msg = "缺少必要的依赖库。请安装 chromadb 或 scikit-learn"
            logger.error(error_msg)
            return JSONResponse(
                content={"error": error_msg},
                status_code=500
            )

        # 获取或创建 RAG 服务
        if final_project_path not in rag_cache:
            rag_cache[final_project_path] = get_rag_service(final_project_path)

        rag_service = rag_cache[final_project_path]

        # 创建流式响应
        async def progress_generator():
            try:
                async for result in rag_service.index_project(force_reindex=force_reindex):
                    yield f"data: {json.dumps(result)}\n\n"
            except Exception as e:
                logger.exception(f"索引项目失败: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(progress_generator(), media_type="text/event-stream")

    except Exception as e:
        logger.exception(f"索引项目失败: {e}")
        return JSONResponse(
            content={"error": f"索引项目失败: {str(e)}"},
            status_code=500
        )


@router.post("/retrieve/{project_name}")
async def retrieve_rag(project_name: str, request: Request):
    """检索相关文档（支持高级检索选项）"""
    try:
        data = await request.json()
        query = data.get("query", "")
        n_results = data.get("n_results", 5)

        # 高级检索选项
        similarity_threshold = data.get("similarity_threshold", 0.0)
        file_types = data.get("file_types", [])
        languages = data.get("languages", [])
        min_chunk_size = data.get("min_chunk_size", 0)
        max_chunk_size = data.get("max_chunk_size", float('inf'))
        sort_by = data.get("sort_by", "similarity")

        if not query:
            return JSONResponse(
                content={"error": "查询文本不能为空"},
                status_code=400
            )

        project_path = _get_project_path(project_name)

        if project_path not in rag_cache:
            rag_cache[project_path] = get_rag_service(project_path)

        rag_service = rag_cache[project_path]

        # 执行检索
        results = rag_service.retrieve(query, n_results)

        # 应用过滤和排序
        filtered_results = []
        for result in results:
            metadata = result.get('metadata', {})
            similarity = result.get('similarity', 0)

            # 相似度阈值过滤
            if similarity < similarity_threshold:
                continue

            # 文件类型过滤
            if file_types:
                file_ext = os.path.splitext(metadata.get('file_path', ''))[1].lower()
                if file_ext not in file_types:
                    continue

            # 编程语言过滤
            if languages:
                language = metadata.get('language', '')
                if language not in languages:
                    continue

            # 块大小过滤
            content_size = len(result.get('content', ''))
            if content_size < min_chunk_size or content_size > max_chunk_size:
                continue

            filtered_results.append(result)

        # 排序
        if sort_by == "similarity":
            filtered_results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        elif sort_by == "date":
            filtered_results.sort(key=lambda x: x.get('metadata', {}).get('timestamp', ''), reverse=True)
        elif sort_by == "size":
            filtered_results.sort(key=lambda x: len(x.get('content', '')), reverse=True)

        # 限制结果数量
        final_results = filtered_results[:n_results]

        return {
            "success": True,
            "query": query,
            "results": final_results,
            "count": len(final_results),
            "total_filtered": len(filtered_results),
            "filters_applied": {
                "similarity_threshold": similarity_threshold,
                "file_types": file_types,
                "languages": languages,
                "min_chunk_size": min_chunk_size,
                "max_chunk_size": max_chunk_size,
                "sort_by": sort_by
            }
        }
    except Exception as e:
        logger.exception(f"RAG 检索失败: {e}")
        return JSONResponse(
            content={"error": f"RAG 检索失败: {str(e)}"},
            status_code=500
        )


@router.post("/reset/{project_name}")
async def reset_rag(project_name: str):
    """重置 RAG 索引"""
    try:
        project_path = _get_project_path(project_name)

        if project_path in rag_cache:
            del rag_cache[project_path]

        # TODO: 实现 RAG 服务的重置逻辑
        # rag_service = get_rag_service(project_path)
        # await rag_service.reset()

        return {"success": True, "message": "RAG 索引已重置"}
    except Exception as e:
        logger.exception(f"重置 RAG 索引失败: {e}")
        return JSONResponse(
            content={"error": f"重置 RAG 索引失败: {str(e)}"},
            status_code=500
        )


@router.post("/clear-cache")
async def clear_rag_cache():
    """清除 RAG 服务缓存"""
    try:
        rag_cache.clear()
        return {"success": True, "message": "RAG 缓存已清除"}
    except Exception as e:
        logger.exception(f"清除 RAG 缓存失败: {e}")
        return JSONResponse(
            content={"error": f"清除 RAG 缓存失败: {str(e)}"},
            status_code=500
        )


@router.post("/ask/{project_name}")
async def ask_rag_question(project_name: str, request: Request):
    """向 RAG 知识库提问"""
    try:
        data = await request.json()
        question = data.get("question", "")

        if not question:
            return JSONResponse(
                content={"error": "问题不能为空"},
                status_code=400
            )

        project_path = _get_project_path(project_name)

        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_cache[project_path] = get_rag_service(project_path)

        rag_service = rag_cache[project_path]

        # 检查是否有文档
        stats = rag_service.get_stats()
        if stats.get("document_count", 0) == 0:
            return JSONResponse(
                content={"answer": "知识库中还没有文档。请先添加文档或索引项目。", "sources": []},
                status_code=200
            )

        # 检索相关文档
        results = rag_service.retrieve(question, n_results=5)

        if not results or len(results) == 0:
            return JSONResponse(
                content={"answer": "知识库中没有找到相关文档。", "sources": []},
                status_code=200
            )

        # 构建上下文和来源
        context_parts = []
        sources = []

        for i, result in enumerate(results):
            metadata = result.get('metadata', {})
            similarity = result.get('similarity', 0)

            file_path = metadata.get('file_path', '未知文件')
            chunk_index = metadata.get('chunk_index', 0)
            total_chunks = metadata.get('total_chunks', 1)
            start_line = metadata.get('start_line', 1)
            end_line = metadata.get('end_line', 1)
            language = metadata.get('language', '')
            summary = metadata.get('summary', '')

            source_desc = f"{file_path}"
            if language:
                source_desc += f" ({language})"
            if start_line and end_line:
                source_desc += f" [行 {start_line}-{end_line}]"

            context_parts.append(f"[文档 {i+1}] {source_desc}:\n{result['content']}")

            sources.append({
                "file_path": file_path,
                "content": result['content'][:200] + '...' if len(result['content']) > 200 else result['content'],
                "similarity": similarity,
                "chunk_index": chunk_index,
                "total_chunks": total_chunks,
                "start_line": start_line,
                "end_line": end_line,
                "language": language,
                "summary": summary,
                "source_desc": source_desc
            })

        logger.info(f"RAG 问答: 为问题 '{question}' 找到 {len(sources)} 个来源")

        # TODO: 使用 LLM 生成答案
        # answer = await generate_answer(question, context_parts, sources)

        return {
            "answer": "基于检索到的文档，请参考以下来源信息。",
            "sources": sources,
            "context": context_parts
        }

    except Exception as e:
        logger.exception(f"RAG 问答失败: {e}")
        return JSONResponse(
            content={"error": f"RAG 问答失败: {str(e)}"},
            status_code=500
        )


@router.post("/upload/{project_name}")
async def upload_document_to_rag(project_name: str, request: Request):
    """上传文档到 RAG 知识库"""
    try:
        project_path = _get_project_path(project_name)

        # 解析表单数据
        form = await request.form()
        file = form.get("file")

        if not file:
            return JSONResponse(
                content={"error": "未找到文件"},
                status_code=400
            )

        # 读取文件内容
        content = await file.read()
        text_content = content.decode('utf-8', errors='ignore')

        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_cache[project_path] = get_rag_service(project_path)

        rag_service = rag_cache[project_path]

        # 添加文档
        result = await rag_service.add_document(
            file_name=file.filename,
            content=text_content,
            file_type=os.path.splitext(file.filename)[1].lower()
        )

        return result

    except Exception as e:
        logger.exception(f"上传文档到 RAG 失败: {e}")
        return JSONResponse(
            content={"error": f"上传文档到 RAG 失败: {str(e)}"},
            status_code=500
        )


@router.post("/upload-batch/{project_name}")
async def upload_documents_batch_to_rag(project_name: str, request: Request):
    """批量上传文档到 RAG 知识库"""
    try:
        project_path = _get_project_path(project_name)

        # 解析表单数据
        form = await request.form()
        files = form.getlist("files")

        if not files:
            return JSONResponse(
                content={"error": "未找到文件"},
                status_code=400
            )

        # 保存文件到临时目录
        temp_dir = os.path.join(project_path, ".rag_temp")
        os.makedirs(temp_dir, exist_ok=True)

        file_paths = []
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, 'wb') as f:
                f.write(await file.read())
            file_paths.append(file_path)

        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_cache[project_path] = get_rag_service(project_path)

        rag_service = rag_cache[project_path]

        # 创建流式响应
        async def progress_generator():
            try:
                async for result in rag_service.add_documents_from_files(file_paths):
                    yield f"data: {json.dumps(result)}\n\n"

                    if result.get("type") == "complete":
                        # 清理临时文件
                        for fp in file_paths:
                            try:
                                os.remove(fp)
                            except:
                                pass
                        break
            except Exception as e:
                logger.exception(f"批量上传文档失败: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(progress_generator(), media_type="text/event-stream")

    except Exception as e:
        logger.exception(f"批量上传文档失败: {e}")
        return JSONResponse(
            content={"error": f"批量上传文档失败: {str(e)}"},
            status_code=500
        )


@router.post("/add-files/{project_name}")
async def add_files_to_rag(project_name: str, request: Request):
    """添加系统文件路径到 RAG 知识库（直接读取，不上传）"""
    try:
        data = await request.json()
        file_paths = data.get("file_paths", [])

        logger.info(f"收到添加文件请求，项目: {project_name}, 文件数: {len(file_paths)}")

        if not file_paths:
            return JSONResponse(
                content={"error": "未提供文件路径"},
                status_code=400
            )

        project_path = _get_project_path(project_name)

        # 验证路径安全性
        valid_paths = []
        for file_path in file_paths:
            file_path = os.path.abspath(file_path)

            # 检查路径是否存在
            if not os.path.exists(file_path):
                logger.warning(f"跳过不存在的文件路径: {file_path}")
                continue

            # 检查是否是文件
            if not os.path.isfile(file_path):
                logger.warning(f"跳过非文件路径: {file_path}")
                continue

            # 检查文件大小（限制 500MB）
            try:
                file_size = os.path.getsize(file_path)
                if file_size > 500 * 1024 * 1024:
                    logger.warning(f"跳过过大的文件: {file_path} ({file_size} bytes)")
                    continue
            except:
                logger.warning(f"无法获取文件大小: {file_path}")
                continue

            # 检查文件类型
            allowed_extensions = {
                '.txt', '.md', '.rst', '.py', '.js', '.ts', '.jsx', '.tsx',
                '.java', '.go', '.rs', '.json', '.yaml', '.yml', '.html', '.css',
                '.xml', '.csv', '.log', '.sql', '.sh', '.bat', '.ps1',
                '.docx', '.xlsx', '.pptx', '.pdf'
            }
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in allowed_extensions:
                logger.warning(f"跳过不支持的文件类型: {file_path} ({ext})")
                continue

            valid_paths.append(file_path)
            logger.info(f"文件有效: {file_path}")

        if not valid_paths:
            return JSONResponse(
                content={"error": "没有有效的文件路径（文件不存在、过大或不支持的类型）。支持的最大文件大小: 500MB"},
                status_code=400
            )

        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_cache[project_path] = get_rag_service(project_path)

        rag_service = rag_cache[project_path]

        # 创建流式响应
        async def progress_generator():
            try:
                async for result in rag_service.add_documents_from_files(valid_paths):
                    yield f"data: {json.dumps(result)}\n\n"
            except Exception as e:
                logger.exception(f"添加文件到 RAG 失败: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(progress_generator(), media_type="text/event-stream")

    except Exception as e:
        logger.exception(f"添加文件到 RAG 失败: {e}")
        return JSONResponse(
            content={"error": f"添加文件到 RAG 失败: {str(e)}"},
            status_code=500
        )


# ============================================
# 辅助函数
# ============================================

def _get_project_path(project: str) -> Optional[str]:
    """获取项目路径 - 使用 ProjectRegistry 统一解析"""
    from backend.core.project_registry import resolve_project_path
    return resolve_project_path(project)