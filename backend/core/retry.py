import asyncio
import logging
from typing import Callable, Any, Optional
from functools import wraps
from backend.core.exceptions import AgentError, get_error_handler

logger = logging.getLogger(__name__)


async def execute_with_retry(
    operation: Callable[[], Any],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
) -> Any:
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return await operation()
        except AgentError as e:
            last_error = e
            handler = get_error_handler(e.error_type)

            if not handler.get("retry", False) or attempt >= max_retries:
                logger.error(
                    f"Operation failed after {attempt + 1} attempts: {e.message}",
                    extra={"error_type": e.error_type, "details": e.details}
                )
                raise

            delay = min(base_delay * (exponential_base ** attempt), max_delay)
            if jitter:
                delay += delay * 0.1 * (hash(str(attempt)) % 10) / 10

            logger.warning(
                f"Operation failed (attempt {attempt + 1}/{max_retries + 1}): {e.message}. "
                f"Retrying in {delay:.2f}s...",
                extra={"error_type": e.error_type, "attempt": attempt + 1}
            )

            await asyncio.sleep(delay)

        except Exception as e:
            last_error = AgentError(
                message=str(e),
                error_type="unexpected_error",
                recoverable=True,
                details={"original_exception": type(e).__name__}
            )

            if attempt >= max_retries:
                logger.error(
                    f"Operation failed after {attempt + 1} attempts: {str(e)}",
                    extra={"exception_type": type(e).__name__}
                )
                raise last_error

            delay = min(base_delay * (exponential_base ** attempt), max_delay)
            if jitter:
                delay += delay * 0.1 * (hash(str(attempt)) % 10) / 10

            logger.warning(
                f"Unexpected error (attempt {attempt + 1}/{max_retries + 1}): {str(e)}. "
                f"Retrying in {delay:.2f}s...",
                extra={"exception_type": type(e).__name__, "attempt": attempt + 1}
            )

            await asyncio.sleep(delay)

    raise last_error


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True
) -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            return await execute_with_retry(
                lambda: func(*args, **kwargs),
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                exponential_base=exponential_base,
                jitter=jitter
            )
        return wrapper
    return decorator


class CircuitBreaker:
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        success_threshold: int = 2,
        name: str = "default"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.name = name

        self._state = self.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        self._lock = asyncio.Lock()

    @property
    def state(self) -> str:
        return self._state

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.record_success()
        else:
            self.record_failure()
        self.release()

    async def acquire(self) -> bool:
        async with self._lock:
            if self._state == self.CLOSED:
                return True

            if self._state == self.OPEN:
                if self._last_failure_time and \
                   (asyncio.get_event_loop().time() - self._last_failure_time) >= self.recovery_timeout:
                    self._state = self.HALF_OPEN
                    self._success_count = 0
                    self._failure_count = 0
                    logger.info(f"Circuit breaker '{self.name}' moved to HALF_OPEN")
                    return True
                return False

            if self._state == self.HALF_OPEN:
                return True

            return True

    def release(self):
        self._lock.release()

    def record_success(self):
        if self._state == self.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.success_threshold:
                self._state = self.CLOSED
                self._failure_count = 0
                logger.info(f"Circuit breaker '{self.name}' moved to CLOSED")

    def record_failure(self):
        self._failure_count += 1
        self._last_failure_time = asyncio.get_event_loop().time()

        if self._state == self.HALF_OPEN:
            self._state = self.OPEN
            logger.warning(f"Circuit breaker '{self.name}' moved to OPEN")

        elif self._state == self.CLOSED and self._failure_count >= self.failure_threshold:
            self._state = self.OPEN
            logger.warning(f"Circuit breaker '{self.name}' moved to OPEN (threshold reached)")

    def reset(self):
        self._state = self.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        logger.info(f"Circuit breaker '{self.name}' was reset")


class RetryPolicy:
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retry_on: list = None,
        abort_on: list = None
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retry_on = retry_on or []
        self.abort_on = abort_on or []

    def should_retry(self, error: AgentError) -> bool:
        if error.error_type in self.abort_on:
            return False
        if error.error_type in self.retry_on:
            return True
        return error.recoverable

    def get_delay(self, attempt: int) -> float:
        delay = min(self.base_delay * (self.exponential_base ** attempt), self.max_delay)
        if self.jitter:
            delay += delay * 0.1 * (hash(str(attempt)) % 10) / 10
        return delay

    def get_user_message(self, error: AgentError) -> str:
        handler = get_error_handler(error.error_type)
        return handler.get("user_message", "发生错误，请重试")


DEFAULT_RETRY_POLICY = RetryPolicy(
    max_retries=3,
    base_delay=1.0,
    max_delay=30.0,
    retry_on=["stream_error", "session_error", "tool_execution_error", "file_operation_error"],
    abort_on=["authentication_error", "authorization_error", "security_error", "configuration_error"]
)


FAST_RETRY_POLICY = RetryPolicy(
    max_retries=5,
    base_delay=0.5,
    max_delay=10.0,
    retry_on=["stream_error", "session_error"],
    abort_on=["authentication_error", "authorization_error", "security_error"]
)


SLOW_RETRY_POLICY = RetryPolicy(
    max_retries=2,
    base_delay=3.0,
    max_delay=120.0,
    retry_on=["tool_execution_error", "file_operation_error"],
    abort_on=["authentication_error", "authorization_error", "security_error"]
)
