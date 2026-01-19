"""
性能测试示例

测试系统的性能指标
"""
import pytest
import time
import asyncio
import statistics
from httpx import AsyncClient
from fastapi.testclient import TestClient

# 导入 FastAPI 应用
from backend.app.main import app

# 测试客户端
client = TestClient(app)


class TestAPIPerformance:
    """API 性能测试"""

    def test_projects_list_response_time(self):
        """测试项目列表响应时间"""
        start_time = time.time()

        response = client.get("/api/projects")

        end_time = time.time()
        response_time = end_time - start_time

        # 响应时间应该小于 1 秒
        assert response_time < 1.0, f"响应时间过长: {response_time:.3f}s"
        assert response.status_code == 200

    def test_file_read_response_time(self):
        """测试文件读取响应时间"""
        start_time = time.time()

        response = client.get("/api/projects/default/files")

        end_time = time.time()
        response_time = end_time - start_time

        # 响应时间应该小于 500ms
        assert response_time < 0.5, f"响应时间过长: {response_time:.3f}s"
        assert response.status_code == 200

    def test_git_status_response_time(self):
        """测试 Git 状态响应时间"""
        start_time = time.time()

        response = client.get("/api/git/status", params={"project": "default"})

        end_time = time.time()
        response_time = end_time - start_time

        # 响应时间应该小于 2 秒（Git 操作可能较慢）
        assert response_time < 2.0, f"响应时间过长: {response_time:.3f}s"
        assert response.status_code == 200


class TestConcurrentPerformance:
    """并发性能测试"""

    @pytest.mark.asyncio
    async def test_concurrent_requests_performance(self):
        """测试并发请求性能"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # 测试不同并发级别
            for concurrency in [1, 10, 50, 100]:
                start_time = time.time()

                # 创建并发请求
                tasks = [
                    ac.get("/api/projects/default/files") for _ in range(concurrency)
                ]

                # 等待所有请求完成
                responses = await asyncio.gather(*tasks)

                end_time = time.time()
                total_time = end_time - start_time

                # 计算平均响应时间
                avg_time = total_time / concurrency

                # 验证所有请求都成功
                for response in responses:
                    assert response.status_code == 200

                # 平均响应时间应该随着并发增加而增加，但不应该线性增长
                print(f"并发级别 {concurrency}: 总时间 {total_time:.3f}s, 平均时间 {avg_time:.3f}s")

                # 并发 100 时，平均时间应该小于 500ms
                if concurrency == 100:
                    assert avg_time < 0.5, f"并发性能不足: {avg_time:.3f}s"


class TestMemoryPerformance:
    """内存性能测试"""

    def test_large_project_list_memory(self):
        """测试大型项目列表的内存使用"""
        import tracemalloc

        tracemalloc.start()

        # 获取项目列表
        response = client.get("/api/projects")

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # 内存使用应该小于 10 MB
        assert peak < 10 * 1024 * 1024, f"内存使用过高: {peak / (1024 * 1024):.2f} MB"
        assert response.status_code == 200

    def test_cache_memory_usage(self):
        """测试缓存内存使用"""
        import tracemalloc

        tracemalloc.start()

        # 多次请求相同资源（应该使用缓存）
        for _ in range(10):
            response = client.get("/api/projects")
            assert response.status_code == 200

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # 内存使用应该稳定，不应该持续增长
        assert peak < 20 * 1024 * 1024, f"缓存内存使用过高: {peak / (1024 * 1024):.2f} MB"


class TestCachePerformance:
    """缓存性能测试"""

    def test_cache_hit_performance(self):
        """测试缓存命中性能"""
        # 第一次请求（缓存未命中）
        start_time = time.time()
        response1 = client.get("/api/projects")
        first_time = time.time() - start_time

        # 第二次请求（缓存命中）
        start_time = time.time()
        response2 = client.get("/api/projects")
        second_time = time.time() - start_time

        # 缓存命中应该更快
        assert second_time < first_time, "缓存未生效"
        assert response1.status_code == 200
        assert response2.status_code == 200

        print(f"首次请求: {first_time:.3f}s, 缓存命中: {second_time:.3f}s, 加速比: {first_time / second_time:.2f}x")


class TestLoadPerformance:
    """负载性能测试"""

    def test_sustained_load(self):
        """测试持续负载性能"""
        durations = []

        # 持续发送 100 个请求
        for i in range(100):
            start_time = time.time()
            response = client.get("/api/projects")
            end_time = time.time()

            durations.append(end_time - start_time)
            assert response.status_code == 200

        # 计算统计数据
        avg_duration = statistics.mean(durations)
        p95_duration = statistics.quantiles(durations, n=20)[18]  # 95th percentile
        p99_duration = statistics.quantiles(durations, n=100)[98]  # 99th percentile

        # 验证性能指标
        assert avg_duration < 0.1, f"平均响应时间过长: {avg_duration:.3f}s"
        assert p95_duration < 0.2, f"P95 响应时间过长: {p95_duration:.3f}s"
        assert p99_duration < 0.5, f"P99 响应时间过长: {p99_duration:.3f}s"

        print(f"平均: {avg_duration:.3f}s, P95: {p95_duration:.3f}s, P99: {p99_duration:.3f}s")


class TestStreamingPerformance:
    """流式响应性能测试"""

    def test_streaming_latency(self):
        """测试流式响应延迟"""
        start_time = time.time()

        response = client.get(
            "/stream",
            params={
                "message": "Hello",
                "cwd": "/tmp",
                "model": "test"
            },
            timeout=10.0
        )

        # 计算首字节时间（TTFB）
        first_byte_time = time.time() - start_time

        assert response.status_code == 200
        assert first_byte_time < 1.0, f"首字节时间过长: {first_byte_time:.3f}s"


class TestDatabasePerformance:
    """数据库性能测试"""

    def test_project_storage_performance(self):
        """测试项目存储性能"""
        import os

        start_time = time.time()

        # 创建多个项目
        for i in range(100):
            response = client.post(
                "/api/projects",
                json={"path": f"/tmp/test_project_{i}"}
            )
            assert response.status_code == 200

        end_time = time.time()
        total_time = end_time - start_time
        avg_time = total_time / 100

        # 平均每个项目创建时间应该小于 10ms
        assert avg_time < 0.01, f"项目创建性能不足: {avg_time:.3f}s"

        print(f"创建 100 个项目: 总时间 {total_time:.3f}s, 平均时间 {avg_time:.3f}s")


class TestFileOperationPerformance:
    """文件操作性能测试"""

    def test_file_write_performance(self):
        """测试文件写入性能"""
        test_data = "x" * (1024 * 1024)  # 1 MB 数据

        start_time = time.time()

        response = client.put(
            "/api/projects/default/file",
            json={
                "filePath": "performance_test.txt",
                "content": test_data
            }
        )

        end_time = time.time()
        write_time = end_time - start_time

        # 1 MB 数据写入应该小于 100ms
        assert write_time < 0.1, f"文件写入性能不足: {write_time:.3f}s"
        assert response.status_code == 200

        # 计算吞吐量
        throughput = (1024 * 1024) / write_time / (1024 * 1024)  # MB/s
        print(f"文件写入: {write_time:.3f}s, 吞吐量: {throughput:.2f} MB/s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])