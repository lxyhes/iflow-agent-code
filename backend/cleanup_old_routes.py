"""
批删除 server.py 中的旧路由代码
"""

import re

def remove_old_routes():
    """删除 server.py 中的旧路由代码"""
    
    # 读取文件
    with open('server.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # 找到要删除的路由范围
    routes_to_remove = []
    
    # 定义路由模式
    route_patterns = [
        # RAG 路由（2282-2939 行）
        (2281, 2938, 'RAG'),
        # Workflow 路由（5778-6090 行）
        (5778, 6090, 'Workflow'),
        # Database 路由（5099-5640 行）
        (5098, 5640, 'Database'),
        # Snippets 路由（3274-3620 行）
        (3273, 3620, 'Snippets'),
        # Prompts 路由（3915-4250 行）
        (3914, 4250, 'Prompts'),
        # Solutions 路由（4258-4480 行）
        (4257, 4480, 'Solutions'),
        # TaskMaster 路由（2218-2278 行）
        (2217, 2278, 'TaskMaster'),
    ]
    
    # 从后往前删除，避免行号变化
    for start_line, end_line, name in reversed(route_patterns):
        print(f"删除 {name} 路由（第 {start_line}-{end_line} 行）")
        del lines[start_line-1:end_line-1]
    
    # 写回文件
    with open('server.py', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print(f"✅ 删除完成！文件从 {len(lines) + sum(end-start for start, end, _ in route_patterns)} 行减少到 {len(lines)} 行")

if __name__ == '__main__':
    remove_old_routes()