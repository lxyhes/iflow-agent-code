class AgentError(Exception):
    def __init__(self, message: str, error_type: str = "general_error", recoverable: bool = False, details: dict = None):
        self.message = message
        self.error_type = error_type
        self.recoverable = recoverable
        self.details = details or {}
        super().__init__(message)


class AuthenticationError(AgentError):
    def __init__(self, message: str = "认证失败", details: dict = None):
        super().__init__(message, "authentication_error", recoverable=False, details=details)


class AuthorizationError(AgentError):
    def __init__(self, message: str = "权限不足", details: dict = None):
        super().__init__(message, "authorization_error", recoverable=False, details=details)


class ValidationError(AgentError):
    def __init__(self, message: str = "输入验证失败", field: str = None, details: dict = None):
        error_details = details or {}
        if field:
            error_details['field'] = field
        super().__init__(message, "validation_error", recoverable=True, details=error_details)


class StreamError(AgentError):
    def __init__(self, message: str = "流式响应错误", recoverable: bool = True, details: dict = None):
        super().__init__(message, "stream_error", recoverable=recoverable, details=details)


class SessionError(AgentError):
    def __init__(self, message: str = "会话错误", session_id: str = None, recoverable: bool = True, details: dict = None):
        error_details = details or {}
        if session_id:
            error_details['session_id'] = session_id
        super().__init__(message, "session_error", recoverable=recoverable, details=error_details)


class ToolExecutionError(AgentError):
    def __init__(self, message: str = "工具执行失败", tool_name: str = None, recoverable: bool = True, details: dict = None):
        error_details = details or {}
        if tool_name:
            error_details['tool_name'] = tool_name
        super().__init__(message, "tool_execution_error", recoverable=recoverable, details=error_details)


class FileOperationError(AgentError):
    def __init__(self, message: str = "文件操作错误", file_path: str = None, operation: str = None, recoverable: bool = True, details: dict = None):
        error_details = details or {}
        if file_path:
            error_details['file_path'] = file_path
        if operation:
            error_details['operation'] = operation
        super().__init__(message, "file_operation_error", recoverable=recoverable, details=error_details)


class SecurityError(AgentError):
    def __init__(self, message: str = "安全错误", threat_type: str = None, details: dict = None):
        error_details = details or {}
        if threat_type:
            error_details['threat_type'] = threat_type
        super().__init__(message, "security_error", recoverable=False, details=error_details)


class ConfigurationError(AgentError):
    def __init__(self, message: str = "配置错误", config_key: str = None, recoverable: bool = False, details: dict = None):
        error_details = details or {}
        if config_key:
            error_details['config_key'] = config_key
        super().__init__(message, "configuration_error", recoverable=recoverable, details=error_details)


ERROR_HANDLERS = {
    "authentication_error": {"retry": False, "user_message": "请重新登录以继续"},
    "authorization_error": {"retry": False, "user_message": "您没有权限执行此操作"},
    "validation_error": {"retry": False, "user_message": "请检查输入内容后重试"},
    "stream_error": {"retry": True, "user_message": "连接已断开，正在尝试重新连接..."},
    "session_error": {"retry": True, "user_message": "会话已过期，请重新开始"},
    "tool_execution_error": {"retry": True, "user_message": "工具执行失败，请重试"},
    "file_operation_error": {"retry": True, "user_message": "文件操作失败，请检查权限后重试"},
    "security_error": {"retry": False, "user_message": "检测到不安全的内容，请检查后重试"},
    "configuration_error": {"retry": False, "user_message": "系统配置错误，请联系管理员"},
    "general_error": {"retry": True, "user_message": "发生错误，请重试"}
}


def get_error_handler(error_type: str) -> dict:
    return ERROR_HANDLERS.get(error_type, ERROR_HANDLERS["general_error"])
