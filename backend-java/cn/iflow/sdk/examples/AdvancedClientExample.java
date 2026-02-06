package cn.iflow.sdk.examples;

import cn.iflow.sdk.types.config.ImmutableMcpServerConfig;
import cn.iflow.sdk.types.config.SessionSettings;
import com.google.gson.Gson;
import cn.iflow.sdk.core.IFlowClient;
import cn.iflow.sdk.types.config.IFlowOptions;
import cn.iflow.sdk.types.config.McpServerConfig;
import cn.iflow.sdk.types.enums.MessageType;
import cn.iflow.sdk.types.enums.PermissionMode;
import cn.iflow.sdk.types.enums.McpTransportType;
import cn.iflow.sdk.types.messages.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import cn.iflow.sdk.types.protocol.requests.PermissionOption;
import cn.iflow.sdk.types.protocol.responses.PermissionRequestResult;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;
import reactor.core.publisher.MonoSink;

/**
 * Advanced example using IFlowClient directly.
 * <p>
 * This example demonstrates full control over the conversation flow
 * with bidirectional communication, tool call handling, and interrupts.
 * <p>
 * Corresponds to Python's advanced_client.py and shows:
 * - Basic conversation with IFlowClient
 * - Conversation with files
 * - Manual tool confirmation
 * - Interrupt capability
 * - Multi-turn conversations
 * - Sandbox mode
 */
@Slf4j
public class AdvancedClientExample {


    public static void main(String[] args) {
        log.info("Starting Comprehensive Conversation Demo");

        AdvancedClientExample demo = new AdvancedClientExample();
        demo.runAllExamples();
    }

    /**
     * Run all examples sequentially.
     */
    public void runAllExamples() {
        try {
            basicConversation();
            conversationWithFiles();
            manualToolConfirmation();
            mcpServerConfiguration();
            allowedToolsExample();
            interruptExample();
            multiTurnConversation();
            sandboxMode();

            System.out.println("=".repeat(50));
            System.out.println("🎉 All examples completed!");
            System.out.println("=".repeat(50));

        } catch (Exception e) {
            System.err.println("Examples failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Basic conversation with IFlowClient.
     */
    private void basicConversation() {
        System.out.println("=".repeat(50));
        System.out.println("Basic Conversation Example");
        System.out.println("=".repeat(50));

        try (IFlowClient client = IFlowClient.create()) {
            System.out.println("Connecting to iFlow...");
            client.connect().block();

            // Send a message
            client.sendMessage("What is Python and why is it popular?").block();

            // Receive and process response
            StringBuilder responseBuilder = new StringBuilder();
            handleMessages(client, "Basic Conversation", responseBuilder);

        } catch (Exception e) {
            System.err.println("Basic conversation failed: " + e.getMessage());
        }

        System.out.println();
    }

    /**
     * Conversation including file context.
     */
    private void conversationWithFiles() {
        System.out.println("=".repeat(50));
        System.out.println("Conversation with Files Example");
        System.out.println("=".repeat(50));

        // Create a sample file for demonstration
        Path sampleFile = Paths.get("sample_code.java");
        try {
            Files.write(sampleFile,
                    ("public class Fibonacci {\n" +
                            "    public static int fibonacci(int n) {\n" +
                            "        if (n <= 1) return n;\n" +
                            "        return fibonacci(n-1) + fibonacci(n-2);\n" +
                            "    }\n" +
                            "    \n" +
                            "    public static void main(String[] args) {\n" +
                            "        for (int i = 0; i < 10; i++) {\n" +
                            "            System.out.println(\"fib(\" + i + \") = \" + fibonacci(i));\n" +
                            "        }\n" +
                            "    }\n" +
                            "}").getBytes(), StandardOpenOption.CREATE);

            try (IFlowClient client = IFlowClient.create()) {
                client.connect().block();

                // Send message with file
                client.sendMessage(
                        "Can you optimize this Fibonacci implementation?",
                        List.of(sampleFile)
                ).block();

                StringBuilder responseBuilder = new StringBuilder();
                handleMessages(client, "File Analysis", responseBuilder);

            } catch (Exception e) {
                System.err.println("File conversation failed: " + e.getMessage());
            }

        } catch (Exception e) {
            System.err.println("Failed to create sample file: " + e.getMessage());
        } finally {
            // Clean up
            try {
                Files.deleteIfExists(sampleFile);
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }

        System.out.println();
    }

    /**
     * Example with manual tool call confirmation.
     */
    private void manualToolConfirmation() {
        System.out.println("=".repeat(50));
        System.out.println("Manual Tool Confirmation Example");
        System.out.println("=".repeat(50));

        AtomicBoolean finished = new AtomicBoolean(false);

        // Configure for manual permission mode
        IFlowOptions options = IFlowOptions.builder()
                .permissionMode(PermissionMode.MANUAL)
                .permissionCallback(params -> Mono.create(sink -> {
                    System.out.println("handler call back");
                    // response to user to confirm
                    sink.success(PermissionRequestResult.builder()
                            .outcome(PermissionRequestResult.Outcome.of("selected", params.getOptions().stream().filter(option -> option.getKind().equals("allow_once")).findFirst().map(PermissionOption::getOptionId).orElse(""))).build());
                }))
                .build();

        try (IFlowClient client = IFlowClient.create(options)) {
            client.connect().block();
            client.sendMessage("Create a file called hello.txt with 'Hello World' content").thenMany(
                            client.receiveMessages()
                                    .takeUntil(msg -> msg.getType() == MessageType.TASK_FINISH || msg.getType() == MessageType.ERROR)
                                    .doOnNext(message -> {
                                        switch (message.getType()) {
                                            case ASSISTANT_MESSAGE:
                                                AssistantMessage assistantMsg = (AssistantMessage) message;
                                                if (assistantMsg.getChunk().getText() != null) {
                                                    System.out.print("Assistant: " + assistantMsg.getChunk().getText());
                                                }
                                                break;

                                            case TOOL_CALL:
                                                ToolCallMessage toolCall = (ToolCallMessage) message;
                                                System.out.println("\n🔧 Tool Call: " + toolCall.getLabel());
                                                System.out.println("   Status: " + toolCall.getStatus());
                                                System.out.println("   Status: " + new Gson().toJson(toolCall.getContent()));
                                                break;

                                            case TASK_FINISH:
                                                System.out.println("\n✅ Task completed");
                                                finished.set(true);
                                                break;

                                            case ERROR:
                                                ErrorMessage error = (ErrorMessage) message;
                                                System.err.println("\n❌ Error: " + error.getErrorMessage());
                                                finished.set(true);
                                                break;
                                        }
                                    }))
                    .blockLast(Duration.ofSeconds(10));

        } catch (Exception e) {
            System.err.println("Manual tool confirmation failed: " + e.getMessage());
        }

        System.out.println();
    }

    /**
     * Example with MCP server configuration using different transport types.
     */
    private void mcpServerConfiguration() {
        System.out.println("=".repeat(50));
        System.out.println("MCP Server Configuration Example");
        System.out.println("=".repeat(50));

        try {
            ImmutableMcpServerConfig build = McpServerConfig.builder()
                    .name("12306-mcp")
                    .type(McpTransportType.STDIO)
                    .command("npx")
                    .args(List.of("-y", "@iflow-mcp/12306-mcp@0.3.4")).build();

            // Configure client with campaign MCP server
            IFlowOptions options = IFlowOptions.builder()
                    .addMcpServer(build)
                    .permissionMode(PermissionMode.AUTO)
                    .timeout(Duration.ofSeconds(60))
                    .build();

            try (IFlowClient client = IFlowClient.create(options)) {
                System.out.println("Connecting with MCP servers configured...");
                client.connect().block();

//                client.sendMessage("/mcp").block();
                // Test MCP server functionality
                client.sendMessage("帮我查询明天北京到杭州的高铁的价格最便宜").block();

                StringBuilder responseBuilder = new StringBuilder();
                handleMessages(client, "MCP Configuration", responseBuilder);

                System.out.println("\n✅ MCP server configuration test completed");
            } catch (Exception e) {
                System.err.println("⚠️ MCP configuration failed: " + e.getMessage());
                System.out.println("Note: This example requires actual MCP servers to be running");
            }

        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("MCP server configuration example failed");
        }

        System.out.println();
    }
    /**
     * Example with allowed tools configuration to restrict available functionality.
     */
    private void allowedToolsExample() {
        System.out.println("=".repeat(50));
        System.out.println("Allowed Tools Configuration Example");
        System.out.println("=".repeat(50));

        try {
            // Configure client with restricted tool access
            IFlowOptions options = IFlowOptions.builder()
                    .sessionSettings(SessionSettings.builder()
                            .allowedTools(List.of("read_file","write_file","list_files"))
                            .disallowedTools(List.of("execute_command","network_request"))
                            .systemPrompt("You are a helpful assistant with limited file system access. " +
                                    "You can only read, write, and list files. You cannot execute commands or make network requests.")
                            .maxTurns(5)
                            .build()
                    )
                    .permissionMode(PermissionMode.AUTO)
                    // File access settings
                    .fileAccess(true)
                    .fileReadOnly(false)
                    .addFileAllowedDir(System.getProperty("user.home") + "/Documents")
                    .fileMaxSize(5 * 1024 * 1024L) // 5MB limit

                    .build();

            try (IFlowClient client = IFlowClient.create(options)) {
                System.out.println("Connecting with restricted tool access...");
                client.connect().block();

                // Test with file operations (should work)
                System.out.println("\nTesting allowed operations:");
                client.sendMessage("Create a simple text file called 'test-allowed.txt' with some sample content.").block();

                StringBuilder responseBuilder = new StringBuilder();
                handleMessages(client, "Allowed Tools Test 1", responseBuilder);

                // Test with restricted operation (should be limited)
                System.out.println("\n\nTesting restricted operations:");
                client.sendMessage("Run the 'ls -la' command to show all files in the current directory.").block();

                handleMessages(client, "Allowed Tools Test 2", responseBuilder);

                System.out.println("\n✅ Tool restriction test completed");

            } catch (Exception e) {
                System.err.println("Allowed tools example failed: " + e.getMessage());
            }

        } catch (Exception e) {
            System.err.println("Tool configuration example failed: " + e.getMessage());
        }

        System.out.println();
    }

    /**
     * Example showing interrupt capability.
     */
    private void interruptExample() {
        System.out.println("=".repeat(50));
        System.out.println("Interrupt Example");
        System.out.println("=".repeat(50));

        try (IFlowClient client = IFlowClient.create()) {
            client.connect().block();

            // Send a request that would generate a long response
            client.sendMessage("Write a detailed essay about machine learning").block();

            AtomicBoolean finished = new AtomicBoolean(false);
            final int[] charCount = {0};

            client.receiveMessages()
                    .takeUntil(msg -> finished.get())
                    .doOnNext(message -> {
                        if (message.getType() == MessageType.ASSISTANT_MESSAGE) {
                            AssistantMessage assistantMsg = (AssistantMessage) message;
                            if (assistantMsg.getChunk().getText() != null) {
                                System.out.print(assistantMsg.getChunk().getText());
                                charCount[0] += assistantMsg.getChunk().getText().length();

                                // Interrupt after 200 characters
                                if (charCount[0] > 200) {
                                    System.out.println("\n\n⚡ Interrupting generation...");
                                    try {
                                        client.interrupt().block();
                                    } catch (Exception e) {
                                        System.err.println("Failed to interrupt: " + e.getMessage());
                                    }
                                    finished.set(true);
                                }
                            }
                        } else if (message.getType() == MessageType.TASK_FINISH) {
                            System.out.println("\n✅ Completed");
                            finished.set(true);
                        }
                    })
                    .doOnError(error -> {
                        System.err.println("\n❌ Stream error: " + error.getMessage());
                        finished.set(true);
                    })
                    .doOnComplete(() -> {
                        System.out.println("\n✅ Stream completed");
                        finished.set(true);
                    })
                    .blockLast(Duration.ofSeconds(10));

        } catch (Exception e) {
            System.err.println("Interrupt example failed: " + e.getMessage());
        }

        System.out.println();
    }

    /**
     * Multi-turn interactive conversation.
     */
    private void multiTurnConversation() {
        System.out.println("=".repeat(50));
        System.out.println("Multi-turn Conversation Example");
        System.out.println("=".repeat(50));

        try (IFlowClient client = IFlowClient.create()) {
            client.connect().block();

            // Turn 1
            System.out.println("User: What is recursion?");
            client.sendMessage("What is recursion?").block();

            StringBuilder responseBuilder = new StringBuilder();
            handleMessages(client, "Turn 1", responseBuilder);

            // Turn 2 - Follow-up in same conversation
            System.out.println("\nUser: Can you give a Java example?");
            client.sendMessage("Can you give a Java example?").block();

            handleMessages(client, "Turn 2", responseBuilder);

            System.out.println("\n✅ Multi-turn conversation completed");

        } catch (Exception e) {
            System.err.println("Multi-turn conversation failed: " + e.getMessage());
        }

        System.out.println();
    }

    /**
     * Example using sandbox mode.
     */
    private void sandboxMode() {
        System.out.println("=".repeat(50));
        System.out.println("Sandbox Mode Example");
        System.out.println("=".repeat(50));

        // Configure for sandbox
        IFlowOptions options = IFlowOptions.getDefault().forSandbox();

        try (IFlowClient client = IFlowClient.create(options)) {
            client.connect().block();
            client.sendMessage("Hello from sandbox mode!").block();

            StringBuilder responseBuilder = new StringBuilder();
            handleMessages(client, "Sandbox", responseBuilder);

            System.out.println("\n✅ Sandbox test completed");

        } catch (Exception e) {
            System.err.println("⚠️ Sandbox connection failed: " + e.getMessage());
            System.out.println("Make sure you have sandbox access configured");
        }

        System.out.println();
    }


    /**
     * Helper method to handle messages and build response using reactive Flux.
     */
    private void handleMessages(IFlowClient client, String context, StringBuilder responseBuilder) {
        try {
            AtomicBoolean finished = new AtomicBoolean(false);

            // Use reactive stream to handle messages
            client.receiveMessages()
                    .takeUntil(msg -> msg.getType() == MessageType.TASK_FINISH || msg.getType() == MessageType.ERROR)
                    .doOnNext(message -> {
                        switch (message.getType()) {
                            case ASSISTANT_MESSAGE:
                                AssistantMessage assistantMsg = (AssistantMessage) message;
                                String text = assistantMsg.getChunk().getText();
                                if (text != null && !text.isEmpty()) {
                                    System.out.print(text);
                                    responseBuilder.append(text);
                                }
                                break;

                            case TOOL_CALL:
                                ToolCallMessage toolCall = (ToolCallMessage) message;
                                String toolInfo = "[工具调用: " + toolCall.getLabel() + "]";
                                System.out.println("\n" + toolInfo);
                                responseBuilder.append("\n").append(toolInfo);
                                break;
                            case TOOL_CALL_RESULT:
                                ToolResultMessage toolResult = (ToolResultMessage) message;
                                ToolCallContent content = toolResult.getContent();
                                responseBuilder.append("\n").append(content);
                                break;
                            case PLAN:
                                PlanMessage plan = (PlanMessage) message;
                                String planInfo = "[计划: " + plan.getEntries().size() + " 个步骤]";
                                System.out.println("\n" + planInfo);
                                responseBuilder.append("\n").append(planInfo);

                                // Display plan entries
                                for (PlanMessage.PlanEntry entry : plan.getEntries()) {
                                    String entryInfo = "  - " + entry.getContent() + " [" + entry.getStatus() + "]";
                                    System.out.println(entryInfo);
                                    responseBuilder.append("\n").append(entryInfo);
                                }
                                break;

                            case TASK_FINISH:
                                TaskFinishMessage finish = (TaskFinishMessage) message;
                                System.out.println("\n[" + context + " 完成]");
                                finished.set(true);
                                break;

                            case ERROR:
                                ErrorMessage error = (ErrorMessage) message;
                                String errorInfo = "[错误: " + error.getErrorMessage() + "]";
                                System.err.println("\n" + errorInfo);
                                responseBuilder.append("\n").append(errorInfo);
                                finished.set(true);
                                break;
                        }
                    })
                    .doOnComplete(() -> finished.set(true))
                    .doOnError(error -> {
                        error.printStackTrace();
                        finished.set(true);
                    })
                    .blockLast(Duration.ofSeconds(100));

        } catch (Exception e) {
            System.err.println("消息处理失败: " + e.getMessage());
        }
    }
}