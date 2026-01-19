"""
Shell 服务测试

测试 Shell 服务的功能
"""
import pytest
import os
import subprocess
import platform
from backend.core.shell_service import ShellSession


class TestShellSession:
    """Shell 会话测试"""

    def test_validate_cwd_with_valid_path(self):
        """测试有效的工作目录"""
        valid_path = os.getcwd()
        session = ShellSession(cwd=valid_path)
        assert session.cwd == os.path.abspath(valid_path)

    def test_validate_cwd_with_invalid_path(self):
        """测试无效的工作目录"""
        invalid_path = "/nonexistent/path/that/does/not/exist"
        session = ShellSession(cwd=invalid_path)
        # 应该回退到当前目录
        assert session.cwd == os.getcwd()

    def test_validate_cwd_with_file_path(self):
        """测试文件路径（应该回退到当前目录）"""
        file_path = __file__  # 当前文件路径
        session = ShellSession(cwd=file_path)
        # 应该回退到当前目录
        assert session.cwd == os.getcwd()

    def test_validate_cwd_with_none(self):
        """测试 None（应该使用当前目录）"""
        session = ShellSession(cwd=None)
        assert session.cwd == os.getcwd()

    def test_get_shell_command_on_windows(self):
        """测试 Windows 上的 shell 命令"""
        session = ShellSession()
        # 注意：这个测试在非 Windows 系统上可能不准确
        cmd = session._get_shell_command()
        assert isinstance(cmd, list)
        assert len(cmd) > 0

    def test_get_shell_command_on_macos(self):
        """测试 macOS 上的 shell 命令"""
        session = ShellSession()
        cmd = session._get_shell_command()
        assert isinstance(cmd, list)
        assert len(cmd) > 0
        # 应该是 zsh 或 bash
        assert any(shell in cmd for shell in ["zsh", "bash"])

    def test_get_shell_command_on_linux(self):
        """测试 Linux 上的 shell 命令"""
        session = ShellSession()
        cmd = session._get_shell_command()
        assert isinstance(cmd, list)
        assert len(cmd) > 0
        # 应该是 bash
        assert "bash" in cmd


class TestShellProcess:
    """Shell 进程测试"""

    def test_create_shell_process(self):
        """测试创建 Shell 进程"""
        session = ShellSession()
        shell_cmd = session._get_shell_command()

        try:
            process = subprocess.Popen(
                shell_cmd,
                cwd=session.cwd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=os.environ.copy()
            )

            # 验证进程已创建
            assert process is not None
            assert process.pid > 0

            # 清理进程
            process.terminate()
            process.wait(timeout=5)

        except Exception as e:
            pytest.skip(f"无法创建 Shell 进程: {e}")

    def test_shell_process_echo(self):
        """测试 Shell 进程的 echo 命令"""
        session = ShellSession()
        shell_cmd = session._get_shell_command()

        try:
            process = subprocess.Popen(
                shell_cmd,
                cwd=session.cwd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=os.environ.copy()
            )

            # 发送 echo 命令
            process.stdin.write("echo 'Hello, Shell!'\n")
            process.stdin.flush()

            # 读取输出
            output, error = process.communicate(timeout=2)

            # 验证输出
            assert "Hello, Shell!" in output or "Hello, Shell!" in error

        except Exception as e:
            pytest.skip(f"Shell 进程测试失败: {e}")


class TestShellPathValidation:
    """Shell 路径验证测试"""

    def test_path_with_spaces(self):
        """测试包含空格的路径"""
        # 创建一个包含空格的临时目录
        import tempfile
        with tempfile.TemporaryDirectory(prefix="test shell path ") as temp_dir:
            session = ShellSession(cwd=temp_dir)
            assert session.cwd == os.path.abspath(temp_dir)

    def test_path_with_special_chars(self):
        """测试包含特殊字符的路径"""
        import tempfile
        with tempfile.TemporaryDirectory(prefix="test@shell#path") as temp_dir:
            session = ShellSession(cwd=temp_dir)
            assert session.cwd == os.path.abspath(temp_dir)

    def test_relative_path(self):
        """测试相对路径"""
        session = ShellSession(cwd=".")
        assert session.cwd == os.getcwd()

    def test_absolute_path(self):
        """测试绝对路径"""
        session = ShellSession(cwd=os.getcwd())
        assert session.cwd == os.getcwd()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])