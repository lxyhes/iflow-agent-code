package com.iflow.agent.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * CI/CD 配置生成器 API
 * 支持 GitHub Actions、GitLab CI、Jenkins 等主流 CI/CD 平台
 */
@Slf4j
@RestController
@RequestMapping("/api/cicd")
public class CICDController {

    /**
     * 获取支持的 CI/CD 平台列表
     */
    @GetMapping("/platforms")
    public ResponseEntity<Map<String, Object>> getPlatforms() {
        log.info("获取CI/CD平台列表");

        List<Map<String, Object>> platforms = Arrays.asList(
                Map.of(
                        "id", "github",
                        "name", "GitHub Actions",
                        "type", "cloud",
                        "description", "GitHub 原生 CI/CD 解决方案",
                        "icon", "github"
                ),
                Map.of(
                        "id", "gitlab",
                        "name", "GitLab CI",
                        "type", "cloud",
                        "description", "GitLab 内置 CI/CD 工具",
                        "icon", "gitlab"
                ),
                Map.of(
                        "id", "jenkins",
                        "name", "Jenkins",
                        "type", "self-hosted",
                        "description", "开源自动化服务器",
                        "icon", "jenkins"
                ),
                Map.of(
                        "id", "circleci",
                        "name", "CircleCI",
                        "type", "cloud",
                        "description", "云端持续集成平台",
                        "icon", "circleci"
                ),
                Map.of(
                        "id", "travis",
                        "name", "Travis CI",
                        "type", "cloud",
                        "description", "云端 CI/CD 服务",
                        "icon", "travis"
                ),
                Map.of(
                        "id", "azure",
                        "name", "Azure DevOps",
                        "type", "cloud",
                        "description", "微软 DevOps 平台",
                        "icon", "azure"
                )
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "platforms", platforms
        ));
    }

    /**
     * 获取支持的项目类型列表
     */
    @GetMapping("/project-types")
    public ResponseEntity<Map<String, Object>> getProjectTypes() {
        log.info("获取项目类型列表");

        List<Map<String, Object>> projectTypes = Arrays.asList(
                Map.of(
                        "id", "react",
                        "name", "React 前端项目",
                        "language", "JavaScript/TypeScript",
                        "buildTool", "npm/yarn/pnpm"
                ),
                Map.of(
                        "id", "vue",
                        "name", "Vue 前端项目",
                        "language", "JavaScript/TypeScript",
                        "buildTool", "npm/yarn/pnpm"
                ),
                Map.of(
                        "id", "angular",
                        "name", "Angular 前端项目",
                        "language", "TypeScript",
                        "buildTool", "npm"
                ),
                Map.of(
                        "id", "java-maven",
                        "name", "Java (Maven)",
                        "language", "Java",
                        "buildTool", "Maven"
                ),
                Map.of(
                        "id", "java-gradle",
                        "name", "Java (Gradle)",
                        "language", "Java",
                        "buildTool", "Gradle"
                ),
                Map.of(
                        "id", "spring-boot",
                        "name", "Spring Boot",
                        "language", "Java/Kotlin",
                        "buildTool", "Maven/Gradle"
                ),
                Map.of(
                        "id", "nodejs",
                        "name", "Node.js 后端",
                        "language", "JavaScript/TypeScript",
                        "buildTool", "npm/yarn"
                ),
                Map.of(
                        "id", "python",
                        "name", "Python 项目",
                        "language", "Python",
                        "buildTool", "pip/poetry"
                ),
                Map.of(
                        "id", "go",
                        "name", "Go 项目",
                        "language", "Go",
                        "buildTool", "go modules"
                ),
                Map.of(
                        "id", "rust",
                        "name", "Rust 项目",
                        "language", "Rust",
                        "buildTool", "Cargo"
                ),
                Map.of(
                        "id", "docker",
                        "name", "Docker 项目",
                        "language", "多语言",
                        "buildTool", "Docker"
                ),
                Map.of(
                        "id", "flutter",
                        "name", "Flutter 移动应用",
                        "language", "Dart",
                        "buildTool", "flutter"
                )
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "project_types", projectTypes
        ));
    }

    /**
     * 生成 CI/CD 配置文件
     */
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateCicdConfig(@RequestBody Map<String, Object> request) {
        log.info("生成CI/CD配置: {}", request);

        String platform = (String) request.get("platform");
        String projectType = (String) request.get("project_type");
        String projectName = (String) request.getOrDefault("project_name", "my-project");
        Map<String, Object> config = (Map<String, Object>) request.getOrDefault("config", new HashMap<>());

        if (platform == null || projectType == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "平台和项目类型不能为空"
            ));
        }

        Map<String, String> generatedFiles = generateConfigFiles(platform, projectType, projectName, config);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "platform", platform,
                "project_type", projectType,
                "files", generatedFiles
        ));
    }

    /**
     * 将 CI/CD 配置写入项目目录
     */
    @PostMapping("/apply")
    public ResponseEntity<Map<String, Object>> applyCicdConfig(@RequestBody Map<String, Object> request) {
        log.info("应用CI/CD配置到项目: {}", request);

        String platform = (String) request.get("platform");
        String projectType = (String) request.get("project_type");
        String projectPath = (String) request.get("project_path");
        String projectName = (String) request.getOrDefault("project_name", "my-project");
        Map<String, Object> config = (Map<String, Object>) request.getOrDefault("config", new HashMap<>());

        if (platform == null || projectType == null || projectPath == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "平台、项目类型和项目路径不能为空"
            ));
        }

        // 验证项目路径是否存在
        Path path = Paths.get(projectPath);
        if (!Files.exists(path)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "项目路径不存在: " + projectPath
            ));
        }

        // 生成配置文件
        Map<String, String> generatedFiles = generateConfigFiles(platform, projectType, projectName, config);

        // 写入文件
        List<String> createdFiles = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (Map.Entry<String, String> entry : generatedFiles.entrySet()) {
            String fileName = entry.getKey();
            String content = entry.getValue();

            try {
                Path filePath = path.resolve(fileName);
                // 创建父目录
                Files.createDirectories(filePath.getParent());
                // 写入文件
                Files.writeString(filePath, content);
                createdFiles.add(fileName);
                log.info("已创建文件: {}", filePath);
            } catch (IOException e) {
                log.error("写入文件失败: {}", fileName, e);
                errors.add(fileName + ": " + e.getMessage());
            }
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "success", createdFiles.size() > 0,
                    "message", "部分文件写入失败",
                    "created_files", createdFiles,
                    "errors", errors
            ));
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "CI/CD 配置已成功应用到项目",
                "project_path", projectPath,
                "created_files", createdFiles
        ));
    }

    /**
     * 生成配置文件内容
     */
    private Map<String, String> generateConfigFiles(String platform, String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        switch (platform) {
            case "github":
                files.putAll(generateGitHubActionsConfig(projectType, projectName, config));
                break;
            case "gitlab":
                files.putAll(generateGitLabCIConfig(projectType, projectName, config));
                break;
            case "jenkins":
                files.putAll(generateJenkinsConfig(projectType, projectName, config));
                break;
            case "circleci":
                files.putAll(generateCircleCIConfig(projectType, projectName, config));
                break;
            case "travis":
                files.putAll(generateTravisConfig(projectType, projectName, config));
                break;
            case "azure":
                files.putAll(generateAzureDevOpsConfig(projectType, projectName, config));
                break;
            default:
                files.put("README.md", generateGenericConfig(platform, projectType));
        }

        return files;
    }

    /**
     * 生成 GitHub Actions 配置
     */
    private Map<String, String> generateGitHubActionsConfig(String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        boolean includeDeploy = (boolean) config.getOrDefault("includeDeploy", false);
        boolean includeDocker = (boolean) config.getOrDefault("includeDocker", false);
        String deployTarget = (String) config.getOrDefault("deployTarget", "");

        String workflowContent = "";

        switch (projectType) {
            case "react":
            case "vue":
            case "angular":
                workflowContent = generateFrontendWorkflow(projectType, includeDeploy, includeDocker, deployTarget);
                break;
            case "java-maven":
            case "java-gradle":
            case "spring-boot":
                workflowContent = generateJavaWorkflow(projectType, includeDeploy, includeDocker, deployTarget);
                break;
            case "nodejs":
                workflowContent = generateNodeJSWorkflow(includeDeploy, includeDocker, deployTarget);
                break;
            case "python":
                workflowContent = generatePythonWorkflow(includeDeploy, includeDocker, deployTarget);
                break;
            case "go":
                workflowContent = generateGoWorkflow(includeDeploy, includeDocker, deployTarget);
                break;
            case "docker":
                workflowContent = generateDockerWorkflow(deployTarget);
                break;
            default:
                workflowContent = generateGenericWorkflow(projectType);
        }

        files.put(".github/workflows/ci.yml", workflowContent);
        files.put("README.md", generateGitHubActionsReadme(projectType));

        return files;
    }

    private String generateFrontendWorkflow(String projectType, boolean includeDeploy, boolean includeDocker, String deployTarget) {
        StringBuilder sb = new StringBuilder();
        sb.append("name: CI/CD Pipeline\n\n");
        sb.append("on:\n");
        sb.append("  push:\n");
        sb.append("    branches: [ main, develop ]\n");
        sb.append("  pull_request:\n");
        sb.append("    branches: [ main ]\n\n");
        sb.append("jobs:\n");
        sb.append("  build:\n");
        sb.append("    runs-on: ubuntu-latest\n\n");
        sb.append("    strategy:\n");
        sb.append("      matrix:\n");
        sb.append("        node-version: [18.x, 20.x]\n\n");
        sb.append("    steps:\n");
        sb.append("    - name: Checkout code\n");
        sb.append("      uses: actions/checkout@v4\n\n");
        sb.append("    - name: Setup Node.js ${{ matrix.node-version }}\n");
        sb.append("      uses: actions/setup-node@v4\n");
        sb.append("      with:\n");
        sb.append("        node-version: ${{ matrix.node-version }}\n");
        sb.append("        cache: 'npm'\n\n");
        sb.append("    - name: Install dependencies\n");
        sb.append("      run: npm ci\n\n");
        sb.append("    - name: Run linter\n");
        sb.append("      run: npm run lint\n\n");
        sb.append("    - name: Run tests\n");
        sb.append("      run: npm test -- --coverage\n\n");
        sb.append("    - name: Build project\n");
        sb.append("      run: npm run build\n\n");

        if (includeDocker) {
            sb.append("    - name: Build Docker image\n");
            sb.append("      run: |\n");
            sb.append("        docker build -t ${{ github.repository }}:${{ github.sha }} .\n");
            sb.append("        docker tag ${{ github.repository }}:${{ github.sha }} ${{ github.repository }}:latest\n\n");
        }

        if (includeDeploy) {
            sb.append("\n  deploy:\n");
            sb.append("    needs: build\n");
            sb.append("    runs-on: ubuntu-latest\n");
            sb.append("    if: github.ref == 'refs/heads/main'\n\n");
            sb.append("    steps:\n");
            sb.append("    - name: Deploy to ").append(deployTarget.isEmpty() ? "production" : deployTarget).append("\n");
            sb.append("      run: |\n");
            sb.append("        echo \"Deploying to ").append(deployTarget.isEmpty() ? "production" : deployTarget).append("...\"\n");
            sb.append("        # Add your deployment commands here\n");
        }

        return sb.toString();
    }

    private String generateJavaWorkflow(String projectType, boolean includeDeploy, boolean includeDocker, String deployTarget) {
        String buildTool = projectType.equals("java-gradle") ? "gradle" : "maven";
        String buildCmd = projectType.equals("java-gradle") ? "./gradlew build" : "mvn clean package";
        String testCmd = projectType.equals("java-gradle") ? "./gradlew test" : "mvn test";

        StringBuilder sb = new StringBuilder();
        sb.append("name: Java CI/CD Pipeline\n\n");
        sb.append("on:\n");
        sb.append("  push:\n");
        sb.append("    branches: [ main, develop ]\n");
        sb.append("  pull_request:\n");
        sb.append("    branches: [ main ]\n\n");
        sb.append("jobs:\n");
        sb.append("  build:\n");
        sb.append("    runs-on: ubuntu-latest\n\n");
        sb.append("    steps:\n");
        sb.append("    - name: Checkout code\n");
        sb.append("      uses: actions/checkout@v4\n\n");
        sb.append("    - name: Set up JDK 17\n");
        sb.append("      uses: actions/setup-java@v4\n");
        sb.append("      with:\n");
        sb.append("        java-version: '17'\n");
        sb.append("        distribution: 'temurin'\n");
        sb.append("        cache: ").append(buildTool).append("\n\n");
        sb.append("    - name: Build with ").append(buildTool).append("\n");
        sb.append("      run: ").append(buildCmd).append("\n\n");
        sb.append("    - name: Run tests\n");
        sb.append("      run: ").append(testCmd).append("\n\n");

        if (includeDocker) {
            sb.append("    - name: Build Docker image\n");
            sb.append("      run: |\n");
            sb.append("        docker build -t ${{ github.repository }}:${{ github.sha }} .\n");
            sb.append("        docker tag ${{ github.repository }}:${{ github.sha }} ${{ github.repository }}:latest\n\n");
        }

        if (includeDeploy) {
            sb.append("\n  deploy:\n");
            sb.append("    needs: build\n");
            sb.append("    runs-on: ubuntu-latest\n");
            sb.append("    if: github.ref == 'refs/heads/main'\n\n");
            sb.append("    steps:\n");
            sb.append("    - name: Deploy\n");
            sb.append("      run: echo \"Deploying...\"\n");
        }

        return sb.toString();
    }

    private String generateNodeJSWorkflow(boolean includeDeploy, boolean includeDocker, String deployTarget) {
        StringBuilder sb = new StringBuilder();
        sb.append("name: Node.js CI/CD\n\n");
        sb.append("on:\n");
        sb.append("  push:\n");
        sb.append("    branches: [ main, develop ]\n");
        sb.append("  pull_request:\n");
        sb.append("    branches: [ main ]\n\n");
        sb.append("jobs:\n");
        sb.append("  build:\n");
        sb.append("    runs-on: ubuntu-latest\n\n");
        sb.append("    steps:\n");
        sb.append("    - uses: actions/checkout@v4\n");
        sb.append("    - name: Setup Node.js\n");
        sb.append("      uses: actions/setup-node@v4\n");
        sb.append("      with:\n");
        sb.append("        node-version: '20'\n");
        sb.append("        cache: 'npm'\n\n");
        sb.append("    - run: npm ci\n");
        sb.append("    - run: npm run build --if-present\n");
        sb.append("    - run: npm test\n");

        return sb.toString();
    }

    private String generatePythonWorkflow(boolean includeDeploy, boolean includeDocker, String deployTarget) {
        return """
            name: Python CI/CD

            on:
              push:
                branches: [ main, develop ]
              pull_request:
                branches: [ main ]

            jobs:
              test:
                runs-on: ubuntu-latest
                strategy:
                  matrix:
                    python-version: ['3.9', '3.10', '3.11', '3.12']

                steps:
                - uses: actions/checkout@v4
                - name: Set up Python ${{ matrix.python-version }}
                  uses: actions/setup-python@v5
                  with:
                    python-version: ${{ matrix.python-version }}
                - name: Install dependencies
                  run: |
                    python -m pip install --upgrade pip
                    pip install -r requirements.txt
                - name: Run tests
                  run: |
                    pytest --cov=./ --cov-report=xml
                - name: Upload coverage
                  uses: codecov/codecov-action@v3
            """;
    }

    private String generateGoWorkflow(boolean includeDeploy, boolean includeDocker, String deployTarget) {
        return """
            name: Go CI/CD

            on:
              push:
                branches: [ main, develop ]
              pull_request:
                branches: [ main ]

            jobs:
              build:
                runs-on: ubuntu-latest
                steps:
                - uses: actions/checkout@v4
                - name: Set up Go
                  uses: actions/setup-go@v5
                  with:
                    go-version: '1.21'
                - name: Build
                  run: go build -v ./...
                - name: Test
                  run: go test -v ./...
                - name: Lint
                  uses: golangci/golangci-lint-action@v3
            """;
    }

    private String generateDockerWorkflow(String deployTarget) {
        return """
            name: Docker Build and Push

            on:
              push:
                branches: [ main ]
                tags: [ 'v*' ]

            jobs:
              docker:
                runs-on: ubuntu-latest
                steps:
                - name: Checkout
                  uses: actions/checkout@v4
                - name: Set up Docker Buildx
                  uses: docker/setup-buildx-action@v3
                - name: Login to Docker Hub
                  uses: docker/login-action@v3
                  with:
                    username: ${{ secrets.DOCKER_USERNAME }}
                    password: ${{ secrets.DOCKER_PASSWORD }}
                - name: Build and push
                  uses: docker/build-push-action@v5
                  with:
                    context: .
                    push: true
                    tags: |
                      ${{ secrets.DOCKER_USERNAME }}/${{ github.event.repository.name }}:latest
                      ${{ secrets.DOCKER_USERNAME }}/${{ github.event.repository.name }}:${{ github.sha }}
            """;
    }

    private String generateGenericWorkflow(String projectType) {
        return """
            name: CI Pipeline

            on:
              push:
                branches: [ main, develop ]
              pull_request:
                branches: [ main ]

            jobs:
              build:
                runs-on: ubuntu-latest
                steps:
                - uses: actions/checkout@v4
                - name: Build
                  run: echo "Building project..."
                - name: Test
                  run: echo "Running tests..."
            """;
    }

    /**
     * 生成 GitLab CI 配置
     */
    private Map<String, String> generateGitLabCIConfig(String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        StringBuilder sb = new StringBuilder();
        sb.append("stages:\n");
        sb.append("  - build\n");
        sb.append("  - test\n");
        sb.append("  - deploy\n\n");

        // Build stage
        sb.append("build:\n");
        sb.append("  stage: build\n");
        sb.append("  script:\n");

        switch (projectType) {
            case "react":
            case "vue":
            case "angular":
            case "nodejs":
                sb.append("    - npm ci\n");
                sb.append("    - npm run build\n");
                break;
            case "java-maven":
            case "spring-boot":
                sb.append("    - mvn clean package\n");
                break;
            case "java-gradle":
                sb.append("    - ./gradlew build\n");
                break;
            case "python":
                sb.append("    - pip install -r requirements.txt\n");
                break;
            case "go":
                sb.append("    - go build ./...\n");
                break;
            default:
                sb.append("    - echo \"Building...\"\n");
        }

        sb.append("  artifacts:\n");
        sb.append("    paths:\n");
        sb.append("      - build/\n");
        sb.append("      - dist/\n");
        sb.append("      - target/\n\n");

        // Test stage
        sb.append("test:\n");
        sb.append("  stage: test\n");
        sb.append("  script:\n");

        switch (projectType) {
            case "react":
            case "vue":
            case "angular":
            case "nodejs":
                sb.append("    - npm test\n");
                break;
            case "java-maven":
            case "spring-boot":
                sb.append("    - mvn test\n");
                break;
            case "java-gradle":
                sb.append("    - ./gradlew test\n");
                break;
            case "python":
                sb.append("    - pytest\n");
                break;
            case "go":
                sb.append("    - go test ./...\n");
                break;
            default:
                sb.append("    - echo \"Testing...\"\n");
        }

        sb.append("  coverage: '/Coverage: \\d+\\.\\d+%/'\n\n");

        // Deploy stage
        sb.append("deploy:\n");
        sb.append("  stage: deploy\n");
        sb.append("  script:\n");
        sb.append("    - echo \"Deploying...\"\n");
        sb.append("  only:\n");
        sb.append("    - main\n");

        files.put(".gitlab-ci.yml", sb.toString());
        files.put("README.md", generateGitLabCIReadme(projectType));

        return files;
    }

    /**
     * 生成 Jenkins 配置
     */
    private Map<String, String> generateJenkinsConfig(String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        String jenkinsfile = """
            pipeline {
                agent any

                stages {
                    stage('Build') {
                        steps {
                            echo 'Building..'
                            // Add build steps here
                        }
                    }
                    stage('Test') {
                        steps {
                            echo 'Testing..'
                            // Add test steps here
                        }
                    }
                    stage('Deploy') {
                        when {
                            branch 'main'
                        }
                        steps {
                            echo 'Deploying....'
                            // Add deploy steps here
                        }
                    }
                }

                post {
                    always {
                        echo 'Pipeline completed'
                    }
                    success {
                        echo 'Pipeline succeeded'
                    }
                    failure {
                        echo 'Pipeline failed'
                    }
                }
            }
            """;

        files.put("Jenkinsfile", jenkinsfile);
        files.put("README.md", generateJenkinsReadme(projectType));

        return files;
    }

    /**
     * 生成 CircleCI 配置
     */
    private Map<String, String> generateCircleCIConfig(String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        String configYaml = """
            version: 2.1

            jobs:
              build:
                docker:
                  - image: cimg/node:20.0
                steps:
                  - checkout
                  - run:
                      name: Install dependencies
                      command: npm ci
                  - run:
                      name: Run tests
                      command: npm test
                  - run:
                      name: Build
                      command: npm run build

            workflows:
              build-and-test:
                jobs:
                  - build
            """;

        files.put(".circleci/config.yml", configYaml);
        files.put("README.md", generateCircleCIReadme(projectType));

        return files;
    }

    /**
     * 生成 Travis CI 配置
     */
    private Map<String, String> generateTravisConfig(String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        String travisYaml = """
            language: node_js
            node_js:
              - "20"
              - "18"

            cache:
              directories:
                - node_modules

            script:
              - npm run lint
              - npm test
              - npm run build

            branches:
              only:
                - main
                - develop
            """;

        files.put(".travis.yml", travisYaml);
        files.put("README.md", generateTravisReadme(projectType));

        return files;
    }

    /**
     * 生成 Azure DevOps 配置
     */
    private Map<String, String> generateAzureDevOpsConfig(String projectType, String projectName, Map<String, Object> config) {
        Map<String, String> files = new HashMap<>();

        String azureYaml = """
            trigger:
              - main
              - develop

            pool:
              vmImage: 'ubuntu-latest'

            stages:
              - stage: Build
                jobs:
                  - job: BuildJob
                    steps:
                      - task: NodeTool@0
                        inputs:
                          versionSpec: '20.x'
                        displayName: 'Install Node.js'

                      - script: npm ci
                        displayName: 'Install dependencies'

                      - script: npm run build
                        displayName: 'Build'

                      - script: npm test
                        displayName: 'Run tests'

              - stage: Deploy
                condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
                jobs:
                  - job: DeployJob
                    steps:
                      - script: echo 'Deploying...'
                        displayName: 'Deploy'
            """;

        files.put("azure-pipelines.yml", azureYaml);
        files.put("README.md", generateAzureDevOpsReadme(projectType));

        return files;
    }

    /**
     * 生成通用配置
     */
    private String generateGenericConfig(String platform, String projectType) {
        return "# CI/CD Configuration for " + projectType + " on " + platform + "\n\n" +
               "Please refer to the documentation for setup instructions.";
    }

    /**
     * 生成 README 文档
     */
    private String generateGitHubActionsReadme(String projectType) {
        return """
            # CI/CD 配置

            本项目使用 GitHub Actions 进行持续集成和部署。

            ## 工作流说明

            - **触发条件**: Push 到 main/develop 分支，或创建 Pull Request
            - **构建环境**: Ubuntu Latest
            - **Node.js 版本**: 18.x, 20.x

            ## 工作流步骤

            1. 检出代码
            2. 设置 Node.js 环境
            3. 安装依赖
            4. 运行代码检查
            5. 运行测试
            6. 构建项目

            ## 使用方法

            1. 将生成的 `.github/workflows/ci.yml` 文件提交到仓库
            2. 在 GitHub 仓库的 Actions 标签页查看运行状态
            3. 根据需要添加部署步骤

            ## 环境变量

            如需添加环境变量，请在仓库 Settings -> Secrets and variables -> Actions 中配置。
            """;
    }

    private String generateGitLabCIReadme(String projectType) {
        return """
            # GitLab CI 配置

            本项目使用 GitLab CI 进行持续集成和部署。

            ## 流水线阶段

            1. **build**: 构建项目
            2. **test**: 运行测试
            3. **deploy**: 部署到生产环境

            ## 使用方法

            1. 将生成的 `.gitlab-ci.yml` 文件提交到仓库根目录
            2. 在 GitLab 项目的 CI/CD -> Pipelines 查看运行状态
            3. 配置 CI/CD Variables（如需要）

            ## Runner 要求

            - Docker Runner 或 Shell Runner
            - 安装有 Node.js 18+ / Java 17+ / Python 3.9+
            """;
    }

    private String generateJenkinsReadme(String projectType) {
        return """
            # Jenkins 配置

            本项目使用 Jenkins 进行持续集成和部署。

            ## 使用方法

            1. 将生成的 `Jenkinsfile` 提交到仓库根目录
            2. 在 Jenkins 中创建新的 Pipeline 任务
            3. 配置 SCM 为 Git，填写仓库地址
            4. 保存并运行

            ## 插件要求

            - Pipeline 插件
            - Git 插件
            - 根据项目类型可能需要其他插件
            """;
    }

    private String generateCircleCIReadme(String projectType) {
        return """
            # CircleCI 配置

            本项目使用 CircleCI 进行持续集成。

            ## 使用方法

            1. 将生成的 `.circleci/config.yml` 提交到仓库
            2. 在 CircleCI 网站添加项目
            3. 查看构建状态

            ## 配置说明

            - 使用 Docker 执行环境
            - 自动缓存 node_modules
            """;
    }

    private String generateTravisReadme(String projectType) {
        return """
            # Travis CI 配置

            本项目使用 Travis CI 进行持续集成。

            ## 使用方法

            1. 将生成的 `.travis.yml` 提交到仓库根目录
            2. 在 Travis CI 网站启用项目
            3. 查看构建状态
            """;
    }

    private String generateAzureDevOpsReadme(String projectType) {
        return """
            # Azure DevOps 配置

            本项目使用 Azure Pipelines 进行持续集成和部署。

            ## 使用方法

            1. 将生成的 `azure-pipelines.yml` 提交到仓库根目录
            2. 在 Azure DevOps 中创建新的 Pipeline
            3. 选择 YAML 配置方式
            4. 运行 Pipeline

            ## 代理池

            使用 Microsoft-hosted Ubuntu 代理。
            """;
    }
}
