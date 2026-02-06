package cn.iflow.sdk.examples;

import cn.iflow.sdk.core.IFlowClient;
import cn.iflow.sdk.types.config.IFlowOptions;
import cn.iflow.sdk.types.enums.MessageType;
import cn.iflow.sdk.types.messages.*;

import java.time.Duration;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.AtomicBoolean;

import lombok.extern.slf4j.Slf4j;

/**
 * 演示 iFlow SDK 自动启动功能
 * <p>
 * 这个脚本展示了如何使用 iFlow SDK 的自动进程管理功能。
 * SDK 会自动：
 * 1. 检测 iFlow 是否已安装
 * 2. 启动 iFlow 进程（如果没有运行）
 * 3. 找到可用端口
 * 4. 在退出时自动清理进程
 * <p>
 * Corresponds to Python's auto_start.py
 */
@Slf4j
public class AutoStartExample {


    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("iFlow SDK 自动启动演示");
        System.out.println("=".repeat(60));

        try {
            // 演示自动启动功能
            exampleAutoStart();

            // 演示进程管理器
            exampleProcessManager();

            System.out.println("\n" + "=".repeat(60));
            System.out.println("✨ 演示完成!");
            System.out.println("=".repeat(60));
            printFeatureSummary();

        } catch (Exception e) {
            log.error("Auto-start example failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 演示自动启动功能
     */
    private static void exampleAutoStart() {
        // 方式 1: 使用默认设置（自动启动）
        System.out.println("\n📋 方式 1: 默认设置（自动启动）");
        System.out.println("当检测到 iFlow 未运行时，SDK 会自动启动它");

        try (IFlowClient client = IFlowClient.create()) {
            client.connect().block();
            System.out.println("✅ 客户端已连接!");
            System.out.println("   iFlow 进程已自动启动（如果之前未运行）");

            // 发送测试消息
            client.sendMessage("Hello, iFlow! 这是自动启动的演示。").block();
            System.out.println("✅ 消息已发送");

            // 等待一些响应
            int timeout = 20;
            System.out.println("   等待响应 (" + timeout + "秒)...");

            try {
                handleMessagesWithTimeout(client, timeout);
            } catch (Exception e) {
                System.out.println("   超时，继续...");
            }

        } catch (Exception e) {
            System.out.println("❌ 错误: " + e.getMessage());
        }

        System.out.println("\n✨ 客户端已关闭，iFlow 进程已自动清理");

        // 方式 2: 自定义端口
        System.out.println("\n" + "=".repeat(60));
        System.out.println("📋 方式 2: 自定义端口");

        IFlowOptions options = IFlowOptions.builder()
                .autoStartProcess(true)
                .processStartPort(9500)  // 使用自定义起始端口
                .build();

        try (IFlowClient client = IFlowClient.create(options)) {
            client.connect().block();
            System.out.println("✅ 客户端已连接到自定义端口!");
            System.out.println("   URL: ws://localhost:8090/acp");

            client.sendMessage("使用自定义端口的测试").block();
            System.out.println("✅ 消息已发送");

        } catch (Exception e) {
            System.out.println("❌ 错误: " + e.getMessage());
        }

        // 方式 3: 禁用自动启动
        System.out.println("\n" + "=".repeat(60));
        System.out.println("📋 方式 3: 禁用自动启动");
        System.out.println("当你想连接到已经运行的 iFlow 实例时");

        IFlowOptions manualOptions = IFlowOptions.builder()
                .autoStartProcess(false)  // 禁用自动启动
                .url("ws://localhost:8090/acp")  // 指定已运行的 iFlow URL
                .build();

        try (IFlowClient client = IFlowClient.create(manualOptions)) {
            client.connect().block();
            System.out.println("✅ 连接到已运行的 iFlow 实例");
            client.sendMessage("连接到现有实例").block();

        } catch (Exception e) {
            System.out.println("⚠️ 预期的错误（如果 iFlow 未在该端口运行）: " + e.getClass().getSimpleName());
        }
    }

    /**
     * 直接使用进程管理器
     */
    private static void exampleProcessManager() {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("直接使用进程管理器");
        System.out.println("=".repeat(60));

        // Note: Java SDK doesn't expose ProcessManager directly like Python
        // This is a conceptual demonstration
        try {
            System.out.println("Java SDK 的进程管理是内置的，通过 IFlowOptions 配置:");

            IFlowOptions processOptions = IFlowOptions.builder()
                    .autoStartProcess(true)
                    .processStartPort(10000)  // 从端口 10000 开始
                    .processStartTimeout(Duration.ofSeconds(30))
                    .build();

            try (IFlowClient client = IFlowClient.create(processOptions)) {
                System.out.println("✅ 进程管理器配置:");
                System.out.println("   起始端口: " + processOptions.getProcessStartPort());
                System.out.println("   超时时间: " + processOptions.getProcessStartTimeout());

                client.connect().block();
                System.out.println("✅ iFlow 进程已启动");
                System.out.println("   URL: ws://localhost:8090/acp");

                // 进程会在这里运行
                Thread.sleep(2000);

            } // 自动停止进程

            System.out.println("✅ iFlow 进程已自动停止");

        } catch (Exception e) {
            System.out.println("❌ 错误: " + e.getMessage());
        }
    }

    private static void printFeatureSummary() {
        System.out.println("\n重要功能:");
        System.out.println("1. ✅ 自动检测 iFlow 是否安装");
        System.out.println("2. ✅ 自动启动 iFlow 进程");
        System.out.println("3. ✅ 自动查找可用端口");
        System.out.println("4. ✅ 退出时自动清理进程");
        System.out.println("5. ✅ 支持自定义端口范围");
        System.out.println("6. ✅ 可以禁用自动启动功能");
    }

    /**
     * 处理消息，带超时
     */
    private static void handleMessagesWithTimeout(IFlowClient client, int timeoutSeconds) throws Exception {
        AtomicBoolean finished = new AtomicBoolean(false);

        client.receiveMessages()
                .takeUntil(msg -> finished.get())
                .doOnNext(message -> {
                    if (message.getType() == MessageType.ASSISTANT_MESSAGE) {
                        AssistantMessage assistantMsg = (AssistantMessage) message;
                        if (assistantMsg.getChunk().getText() != null) {
                            System.out.print(assistantMsg.getChunk().getText());
                        }
                    } else if (message.getType() == MessageType.TASK_FINISH) {
                        System.out.println("\n   收到消息: " + message.getType());
                        finished.set(true);
                    }
                })
                .doOnComplete(() -> finished.set(true))
                .blockLast(Duration.ofSeconds(timeoutSeconds));
    }

}