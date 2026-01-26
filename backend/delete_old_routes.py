"""
安全删除 server.py 中的旧路由代码
"""

def delete_routes_between_markers():
    """删除两个标记之间的所有内容"""

    with open('server.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 找到要删除的范围
    start_marker = "# --- Database Query API ---"
    end_marker = "# --- Workflow API ---"

    start_line = None
    end_line = None

    for i, line in enumerate(lines):
        if start_marker in line:
            start_line = i
        if end_marker in line and start_line is not None:
            end_line = i
            break

    if start_line is None or end_line is None:
        print(f"❌ 未找到标记: start_line={start_line}, end_line={end_line}")
        return

    print(f"删除第 {start_line + 1} 行到第 {end_line} 行（共 {end_line - start_line} 行）")

    # 删除范围内的行（不包括 end_marker 所在的行）
    del lines[start_line:end_line]

    # 写回文件
    with open('server.py', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"✅ 删除成功！文件从 {len(lines) + (end_line - start_line)} 行减少到 {len(lines)} 行")

if __name__ == '__main__':
    delete_routes_between_markers()