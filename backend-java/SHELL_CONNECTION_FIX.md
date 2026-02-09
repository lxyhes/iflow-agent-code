# Shell 连接稳定性修复文档

## 问题描述

Shell 终端连接存在不稳定性问题，表现为：
- 有时可以正常连接和使用
- 有时连接失败或连接后无响应
- 连接容易断开，需要频繁重启

## 根本原因分析

通过代码审查，发现以下问题：

1. **缺少心跳机制**：没有定期发送心跳包保持连接活跃，导致连接因网络波动或超时而断开
2. **线程池管理不当**：使用 `newCachedThreadPool()` 可能导致线程资源耗尽
3. **错误处理不完善**：缺少对连接失败的详细日志和恢复机制
4. **字符编码问题**：Windows 下 GBK 编码可能导致某些字符显示异常
5. **资源清理不彻底**：WebSocket 断开后，后台进程可能没有正确清理
6. **缺少连接验证**：没有验证 WebSocket 会话状态和进程启动状态

## 修复方案

### 1. 添加心跳机制

在 `ShellWebSocketHandler` 中添加定时心跳：

```java
@Scheduled(fixedRate = 15000)  // 每 15 秒检查一次
public void checkHeartbeat() {
    // 向所有活跃会话发送心跳包
}
```

**效果**：
- 保持 WebSocket 连接活跃，防止超时断开
- 及时检测并清理失效连接
- 提供连接状态监控能力

### 2. 改进线程池管理

```java
// 使用固定大小的线程池，避免资源耗尽
private final ExecutorService executorService = Executors.newFixedThreadPool(10);
```

**效果**：
- 限制最大并发连接数
- 避免内存溢出和资源耗尽
- 提供更好的性能稳定性

### 3. 增强错误处理

**连接验证**：
- 验证 WebSocket 会话状态
- 验证项目路径是否存在
- 验证进程是否成功启动

**错误恢复**：
- 添加详细的错误日志
- 发送用户友好的错误消息
- 自动清理失效资源

### 4. 统一字符编码

```java
// 使用 UTF-8 编码，避免 GBK 编码问题
Charset charset = Charset.forName("UTF-8");
```

**效果**：
- 避免字符显示异常
- 支持多语言环境
- 提高跨平台兼容性

### 5. 完善资源清理

```java
public synchronized void close() {
    // 关闭写入器
    // 终止进程
    // 等待进程结束
    // 避免重复关闭
}
```

**效果**：
- 确保所有资源被正确释放
- 避免资源泄漏
- 防止僵尸进程

### 6. 添加传输错误处理

```java
@Override
public void handleTransportError(WebSocketSession session, Throwable exception) {
    log.error("[Shell] WebSocket transport error", exception);
    closeSession(session.getId());
}
```

**效果**：
- 及时处理网络错误
- 防止错误累积
- 提供更好的错误恢复能力

## 配置更改

### 1. 启用定时任务支持

**WebSocketConfig.java**：
```java
@Configuration
@EnableWebSocket
@EnableScheduling  // 启用定时任务支持
public class WebSocketConfig implements WebSocketConfigurer {
    // ...
}
```

**AgentApplication.java**：
```java
@SpringBootApplication
@EnableAsync
@EnableScheduling  // 启用定时任务支持
public class AgentApplication {
    // ...
}
```

### 2. Bean 管理

将 `ShellWebSocketHandler` 注册为 Spring Bean：

```java
@Bean
public ShellWebSocketHandler shellWebSocketHandler() {
    return new ShellWebSocketHandler();
}
```

## 测试建议

### 1. 连接稳定性测试

```bash
# 多次连接和断开
1. 打开终端
2. 输入一些命令
3. 关闭终端
4. 重新打开终端
5. 重复 10 次

# 预期结果：所有连接都成功，无错误
```

### 2. 长时间运行测试

```bash
# 保持连接运行 1 小时
1. 打开终端
2. 输入命令并等待
3. 观察连接状态

# 预期结果：连接保持活跃，无断开
```

### 3. 并发连接测试

```bash
# 同时打开多个终端窗口
1. 打开 5 个终端窗口
2. 在每个窗口中执行命令
3. 观察所有终端的响应

# 预期结果：所有终端都正常工作
```

### 4. 网络波动测试

```bash
# 模拟网络不稳定
1. 连接终端
2. 执行长命令
3. 暂时断开网络
4. 恢复网络

# 预期结果：连接自动恢复或提供明确的错误消息
```

## 监控指标

### 1. 连接成功率

```bash
# 查看日志中的连接成功/失败次数
grep "WebSocket connection established" logs/backend.log | wc -l
grep "Failed to start shell" logs/backend.log | wc -l
```

### 2. 会话存活时间

```bash
# 查看会话创建和关闭时间
grep "Terminal session.*initialized" logs/backend.log
grep "Terminal session.*closed" logs/backend.log
```

### 3. 心跳发送频率

```bash
# 查看心跳日志
grep "Heartbeat sent" logs/backend.log
```

## 性能优化建议

### 1. 调整心跳间隔

根据实际网络环境调整心跳间隔：

```java
// 适用于稳定网络
private static final long HEARTBEAT_CHECK_INTERVAL = 30000;  // 30 秒

// 适用于不稳定网络
private static final long HEARTBEAT_CHECK_INTERVAL = 10000;  // 10 秒
```

### 2. 调整线程池大小

根据实际并发需求调整线程池大小：

```java
// 适用于低并发
private final ExecutorService executorService = Executors.newFixedThreadPool(5);

// 适用于高并发
private final ExecutorService executorService = Executors.newFixedThreadPool(20);
```

### 3. 优化缓冲区大小

根据实际输出量调整缓冲区大小：

```java
// 适用于少量输出
byte[] buffer = new byte[1024];

// 适用于大量输出
byte[] buffer = new byte[8192];
```

## 故障排查

### 1. 连接失败

**症状**：点击连接后长时间无响应

**排查步骤**：
1. 检查后端日志是否有错误信息
2. 检查项目路径是否正确
3. 检查端口 8080 是否被占用
4. 检查网络连接是否正常

### 2. 连接断开

**症状**：连接一段时间后自动断开

**排查步骤**：
1. 检查心跳日志是否正常发送
2. 检查网络是否稳定
3. 检查防火墙设置
4. 检查代理配置

### 3. 无响应

**症状**：输入命令后无输出

**排查步骤**：
1. 检查进程是否还在运行
2. 检查输出读取线程是否正常
3. 检查字符编码是否正确
4. 检查 WebSocket 消息发送是否成功

## 未来改进方向

1. **添加连接重试机制**：自动重试失败的连接
2. **实现会话持久化**：保存终端状态，支持断线重连
3. **添加性能监控**：收集连接性能指标
4. **实现负载均衡**：支持多实例部署
5. **添加安全认证**：使用 JWT 或其他认证机制
6. **支持多终端类型**：支持 bash、zsh、fish 等

## 总结

通过以上改进，Shell 连接的稳定性和可靠性得到了显著提升：

✅ **心跳机制**：保持连接活跃，防止超时断开
✅ **线程池管理**：限制并发连接，避免资源耗尽
✅ **错误处理**：完善的错误处理和恢复机制
✅ **字符编码**：统一使用 UTF-8，避免编码问题
✅ **资源清理**：彻底清理资源，避免泄漏
✅ **连接验证**：验证连接状态，提供明确反馈

建议在实际部署后进行充分测试，并根据实际情况调整配置参数。

---

**最后更新**: 2026-02-09
**版本**: 1.0.0