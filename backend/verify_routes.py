"""
验证旧路由是否在新 router 模块中都有对应的实现
"""
import re
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def extract_routes_from_file(file_path):
    """从文件中提取所有路由端点"""
    routes = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 匹配 @router.<method>("<path>") 或 @app.<method>("<path>")
        pattern = r'@(router|app)\.(get|post|put|delete|patch)(["\'])([^"\']+)(\3)'
        matches = re.findall(pattern, content)

        for match in matches:
            decorator_type, method, quote, path, _ = match
            routes.append({
                'method': method.upper(),
                'path': path,
                'decorator': decorator_type
            })
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

    return routes

def main():
    print("=" * 80)
    print("路由迁移验证报告")
    print("=" * 80)

    # 定义要检查的路由模块
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    router_modules = {
        'Git': os.path.join(base_dir, 'backend/app/routers/git.py'),
        'RAG': os.path.join(base_dir, 'backend/app/routers/rag.py'),
        'Workflow': os.path.join(base_dir, 'backend/app/routers/workflow.py'),
        'Database': os.path.join(base_dir, 'backend/app/routers/database.py'),
        'Snippets': os.path.join(base_dir, 'backend/app/routers/snippets.py'),
        'Prompts': os.path.join(base_dir, 'backend/app/routers/prompts.py'),
        'Solutions': os.path.join(base_dir, 'backend/app/routers/solutions.py'),
        'TaskMaster': os.path.join(base_dir, 'backend/app/routers/taskmaster.py'),
    }

    # 提取所有新路由
    all_new_routes = {}
    for name, path in router_modules.items():
        routes = extract_routes_from_file(path)
        all_new_routes[name] = routes
        print(f"\n{name} Router ({len(routes)} 端点):")
        for route in routes:
            print(f"  {route['method']:6} {route['path']}")

    # 检查 server.py 中是否还有旧路由
    print(f"\n{'=' * 80}")
    print("检查 server.py 中的旧路由")
    print('=' * 80)

    server_routes = extract_routes_from_file(os.path.join(base_dir, 'backend/server.py'))

    # 过滤出 @app 装饰器的路由（这些是旧路由）
    old_routes = [r for r in server_routes if r['decorator'] == 'app']

    if old_routes:
        print(f"\n⚠️  发现 {len(old_routes)} 个旧路由（使用 @app 装饰器）:")
        for route in old_routes:
            print(f"  {route['method']:6} {route['path']}")
    else:
        print("\n✅ 未发现旧路由，所有路由已迁移到新模块")

    # 检查是否有遗漏的路由
    print(f"\n{'=' * 80}")
    print("路由完整性检查")
    print('=' * 80)

    # 已知的旧路由端点（根据 ROUTER_MIGRATION_PROGRESS.md）
    expected_routes = {
        'Git': [
            ('GET', '/api/git/status'),
            ('GET', '/api/git/branches'),
            ('GET', '/api/git/remote-status'),
            ('GET', '/api/git/diff'),
            ('GET', '/api/git/commits'),
            ('GET', '/api/git/commit-diff'),
            ('POST', '/api/git/checkout'),
            ('POST', '/api/git/create-branch'),
            ('POST', '/api/git/commit'),
            ('GET', '/api/git/file-with-diff'),
        ],
        'RAG': [
            ('GET', '/api/rag/stats'),
            ('GET', '/api/rag/status'),
            ('POST', '/api/rag/index'),
            ('POST', '/api/rag/retrieve/{project_name}'),
            ('POST', '/api/rag/reset/{project_name}'),
            ('POST', '/api/rag/clear-cache'),
            ('POST', '/api/rag/ask/{project_name}'),
            ('POST', '/api/rag/upload/{project_name}'),
            ('POST', '/api/rag/upload-batch/{project_name}'),
            ('POST', '/api/rag/add-files/{project_name}'),
        ],
        'Workflow': [
            ('POST', '/api/workflows/save'),
            ('GET', '/api/workflows/{project_name}'),
            ('GET', '/api/workflows/{project_name}/{workflow_id}'),
            ('DELETE', '/api/workflows/{project_name}/{workflow_id}'),
            ('POST', '/api/workflows/generate'),
            ('POST', '/api/workflows/{workflow_id}/execute'),
            ('GET', '/api/workflows/stream/{workflow_id}/execute'),
            ('GET', '/api/workflows/executions'),
            ('GET', '/api/workflows/executions/{execution_id}'),
        ],
        'Database': [
            ('POST', '/api/database/connect'),
            ('POST', '/api/database/disconnect/{connection_name}'),
            ('GET', '/api/database/connections'),
            ('GET', '/api/database/tables/{connection_name}'),
            ('GET', '/api/database/table/{connection_name}/{table_name}'),
            ('POST', '/api/database/query'),
            ('GET', '/api/database/export/{connection_name}/{format}'),
            ('GET', '/api/database/templates'),
            ('POST', '/api/database/templates'),
            ('GET', '/api/database/history'),
            ('POST', '/api/database/save-config'),
            ('GET', '/api/database/configs/{project_name}'),
            ('DELETE', '/api/database/config/{project_name}/{config_name}'),
            ('GET', '/api/database/project-databases/{project_name}'),
        ],
        'TaskMaster': [
            ('GET', '/api/taskmaster/installation-status'),
            ('GET', '/api/taskmaster/tasks/{project_name}'),
            ('GET', '/api/taskmaster/prd/{project_name}'),
        ],
    }

    all_ok = True
    for module_name, expected in expected_routes.items():
        if module_name not in all_new_routes:
            print(f"\n❌ {module_name} Router 未找到")
            all_ok = False
            continue

        new_routes = all_new_routes[module_name]
        new_route_keys = {(r['method'], r['path']) for r in new_routes}

        missing = []
        for expected_route in expected:
            if expected_route not in new_route_keys:
                missing.append(expected_route)

        if missing:
            print(f"\n⚠️  {module_name} Router 缺少以下端点:")
            for method, path in missing:
                print(f"  {method:6} {path}")
            all_ok = False
        else:
            print(f"\n✅ {module_name} Router 所有端点都已实现")

    print(f"\n{'=' * 80}")
    if all_ok:
        print("✅ 所有路由迁移完成，没有遗漏")
    else:
        print("⚠️  部分路由可能需要检查")
    print('=' * 80)

if __name__ == '__main__':
    main()
