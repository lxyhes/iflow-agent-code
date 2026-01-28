#!/usr/bin/env python3
"""
优化验证脚本
验证所有新创建的基础设施是否正常工作
"""
import sys
import os

# 添加项目路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, "backend"))

print("=" * 60)
print("iFlow Agent 项目优化验证")
print("=" * 60)

# 1. 验证服务注册中心
print("\n[1/6] 验证 Service Registry...")
try:
    from backend.core.service_registry import ServiceRegistry, registry
    r = ServiceRegistry()
    print(f"  ✓ Service Registry 创建成功")
    print(f"  - 当前注册服务数: {len(r.list_services())}")
except Exception as e:
    print(f"  ✗ Service Registry 失败: {e}")

# 2. 验证项目注册中心
print("\n[2/6] 验证 Project Registry...")
try:
    from backend.core.project_registry import ProjectRegistry, get_project_registry
    pr = get_project_registry()
    print(f"  ✓ Project Registry 创建成功")
    print(f"  - 项目文件: {pr._projects_file}")
    print(f"  - 注册项目数: {len(pr.list_projects())}")
except Exception as e:
    print(f"  ✗ Project Registry 失败: {e}")

# 3. 验证 Bootstrap
print("\n[3/6] 验证 Bootstrap...")
try:
    from backend.core.bootstrap import ApplicationBootstrap
    bs = ApplicationBootstrap()
    print(f"  ✓ Bootstrap 模块加载成功")
except Exception as e:
    print(f"  ✗ Bootstrap 失败: {e}")

# 4. 验证 Service Facade
print("\n[4/6] 验证 Service Facade...")
try:
    from backend.core.service_facade import (
        CodeAnalysisFacade, 
        AutoFixFacade, 
        IntelligenceFacade,
        intelligence
    )
    print(f"  ✓ Service Facade 加载成功")
    print(f"  - CodeAnalysisFacade: 可用")
    print(f"  - AutoFixFacade: 可用")
    print(f"  - IntelligenceFacade: 可用")
except Exception as e:
    print(f"  ✗ Service Facade 失败: {e}")

# 5. 验证路由模块
print("\n[5/6] 验证路由模块...")
routes_to_check = [
    ("backend.app.routers.system", "system"),
    ("backend.app.routers.intelligence", "intelligence"),
    ("backend.app.routers.git", "git"),
    ("backend.app.routers.rag", "rag"),
]
for module_name, route_name in routes_to_check:
    try:
        module = __import__(module_name, fromlist=["router"])
        router = getattr(module, "router", None)
        if router:
            print(f"  ✓ {route_name} router: 可用")
        else:
            print(f"  ✗ {route_name} router: 未找到 router 对象")
    except Exception as e:
        print(f"  ✗ {route_name} router: {e}")

# 6. 验证主应用
print("\n[6/6] 验证主应用...")
try:
    from backend.app.main import app
    print(f"  ✓ FastAPI 应用加载成功")
    print(f"  - 路由数: {len(app.routes)}")
    
    # 列出所有路由
    api_routes = [r for r in app.routes if hasattr(r, 'path') and r.path.startswith('/api')]
    print(f"  - API 路由数: {len(api_routes)}")
    
    # 检查关键路由
    key_routes = ['/api/system/health', '/api/intelligence/analyze-file']
    for route_path in key_routes:
        found = any(r.path == route_path for r in api_routes if hasattr(r, 'path'))
        status = "✓" if found else "✗"
        print(f"  {status} {route_path}")
        
except Exception as e:
    print(f"  ✗ 主应用加载失败: {e}")
    import traceback
    traceback.print_exc()

# 7. 验证前端服务
print("\n[7/6] 验证前端服务模块...")
frontend_files = [
    "frontend/src/services/intelligenceService.js",
    "frontend/src/hooks/useIntelligence.js",
]
for file_path in frontend_files:
    full_path = os.path.join(project_root, file_path)
    if os.path.exists(full_path):
        size = os.path.getsize(full_path)
        print(f"  ✓ {file_path} ({size} bytes)")
    else:
        print(f"  ✗ {file_path} 不存在")

print("\n" + "=" * 60)
print("验证完成！")
print("=" * 60)
print("\n下一步操作:")
print("1. 启动后端: python -m uvicorn backend.app.main:app --reload")
print("2. 测试 API: curl http://localhost:8000/api/system/health")
print("3. 启动前端: cd frontend && npm run dev")
print("\n详细文档请查看: OPTIMIZATION_SUMMARY.md")
