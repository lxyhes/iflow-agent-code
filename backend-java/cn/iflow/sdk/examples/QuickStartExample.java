package cn.iflow.sdk.examples;

import cn.iflow.sdk.core.IFlowClient;
import cn.iflow.sdk.query.IFlowQuery;
import cn.iflow.sdk.types.config.IFlowOptions;
import cn.iflow.sdk.types.messages.*;
import cn.iflow.sdk.exceptions.IFlowException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Paths;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.AtomicBoolean;

import lombok.extern.slf4j.Slf4j;

import java.time.Duration;

/**
 * Quick start example for iFlow SDK.
 * <p>
 * This example demonstrates the simplest way to use the iFlow SDK
 * for sending queries and receiving responses.
 * <p>
 * Corresponds to Python's quick_start.py and shows:
 * - Simple async queries
 * - Query with files
 * - Streaming responses
 * - Sandbox queries
 * - Synchronous wrapper
 */
@Slf4j
public class
QuickStartExample {


    public static void main(String[] args) {
        log.info("Starting Quick Start Examples");

        try {
            // Example 1: Simple async query
            simpleAsyncQuery();

            // Example 2: Query with files
            queryWithFiles();

            // Example 3: Streaming response
            streamingQuery();

            // Example 4: Sandbox query
            sandboxQuery();

            // Example 5: Synchronous wrapper
            synchronousQuery();

            System.out.println("✅ Quick start examples completed!");

        } catch (Exception e) {
            log.error("Example failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Example 1: Simple query with async/await equivalent.
     * Corresponds to Python's async query example.
     */
    private static void simpleAsyncQuery() {
        System.out.println("\nExample 1: Simple async query");
        System.out.println("-".repeat(40));

        try {
            Mono<List<Message>> query = IFlowQuery.query("What is 2 + 2?");
            AssistantMessage message = (AssistantMessage) query.block().get(0);
            System.out.println("Response: " + message.getChunk().getText());
            System.out.println();

        } catch (Exception e) {
            System.err.println("Query failed: " + e.getMessage());
            System.out.println("Note: Requires running iFlow instance");
            System.out.println();
        }
    }

    /**
     * todo fill it
     * Demonstrates file-based query usage.
     * Corresponds to Python's file-based query example.
     */
    /**
     * Example 2: Query with files.
     * Corresponds to Python's file-based query example.
     */
    private static void queryWithFiles() {
        System.out.println("Example 2: Query with files");
        System.out.println("-".repeat(40));

        try {
            // Create sample file paths for demonstration
            List<Path> files = List.of(
                    Paths.get("README.md"),
                    Paths.get("pom.xml")
            );

            System.out.println("(Skipped - add actual file paths to test)");
            System.out.println("Files would be: " + files);
            System.out.println();

//             CompletableFuture<String> future = IFlowQuery.queryWithFiles(
//                 "Explain this code", files
//             );
//             String response = future.get();
//             System.out.println("Response: " + response);

        } catch (Exception e) {
            System.err.println("File query failed: " + e.getMessage());
            System.out.println();
        }
    }

    /**
     * Example 3: Streaming response.
     * Corresponds to Python's query_stream example.
     */
    private static void streamingQuery() {
        System.out.println("Example 3: Streaming response");
        System.out.println("-".repeat(40));

        try {
            System.out.print("Assistant: ");
            Flux<Message> messageFlux = IFlowQuery.queryStream("Tell me a short joke");

            AtomicBoolean completed = new AtomicBoolean(false);

            messageFlux
                    .takeUntil(message -> completed.get())
                    .doOnNext(message -> {
                        switch (message.getType()) {
                            case ASSISTANT_MESSAGE:
                                AssistantMessage assistantMsg = (AssistantMessage) message;
                                if (assistantMsg.getChunk().getText() != null) {
                                    String text = assistantMsg.getChunk().getText();
                                    System.out.print(text);
                                }
                                break;

                            case PLAN:
                                PlanMessage plan = (PlanMessage) message;
                                System.out.println("\n   📝 [计划: " + plan + "]");
                                break;

                            case TOOL_CALL:
                                ToolCallMessage toolCall = (ToolCallMessage) message;
                                System.out.println("\n   🤖 [工具调用: " + toolCall.getContent().toString() + "]");
                                break;

                            case ERROR:
                                ErrorMessage error = (ErrorMessage) message;
                                System.out.println("\n   ❌ [错误: " + error.getErrorMessage() + "]");
                                break;
                            case TASK_FINISH:
                                completed.set(true);
                                break;
                        }
                    }).blockLast();

        } catch (Exception e) {
            System.err.println("Streaming failed: " + e.getMessage());
            System.out.println();
        }
    }

    /**
     * todo fill it
     * Example 4: Sandbox query.
     * Corresponds to Python's sandbox query example.
     */
    private static void sandboxQuery() {
        System.out.println("Example 4: Sandbox query");
        System.out.println("-".repeat(40));

        try {
            // Create options for sandbox
            IFlowOptions sandboxOptions = IFlowOptions.getDefault().forSandbox();

            System.out.println("(Skipped - requires sandbox access)");
            System.out.println("Sandbox URL: wss://sandbox.iflow.ai/acp");
            System.out.println();

            // Uncomment to test with sandbox (requires sandbox access):
            Mono<List<Message>> query = IFlowQuery.query(
                    "Hello from sandbox!", sandboxOptions
            );
            AssistantMessage message = (AssistantMessage) query.block().get(0);
            System.out.println("Response: " + message.getChunk().getText());

        } catch (Exception e) {
            System.err.println("Sandbox failed: " + e.getMessage());
            System.out.println("Make sure you have sandbox access configured");
            System.out.println();
        }
    }

    /**
     * Example 5: Synchronous query.
     * Corresponds to Python's query_sync example.
     */
    private static void synchronousQuery() {
        System.out.println("Example 5: Synchronous query");
        System.out.println("-".repeat(40));

        try {
            List<Message> messages = IFlowQuery.querySync(
                    "What is the capital of France?",
                    Duration.ofSeconds(30)
            );
            AssistantMessage message = (AssistantMessage) messages.get(0);
            System.out.println("Response: " + message.getChunk().getText());
            System.out.println();

        } catch (Exception e) {
            System.err.println("Sync query failed: " + e.getMessage());
            System.out.println("Note: Requires running iFlow instance");
            System.out.println("In a real deployment, this would return the answer immediately.");
            System.out.println();
        }
    }

}