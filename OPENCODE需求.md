**Oh My OpenCode 实战指南：解锁多 Agent 协同的“超级大脑”
我们在日常开发中使用AI编程工具，如果你觉得现在的 AI 编程助手（比如 Cursor 或 Antigravity）还是有点“单兵作战”，那么 oh-my-opencode 就是为了把它们变成“正规军”而生的。

注意：这不是一个在 VS Code 插件商店里搜索下载的普通插件，也不是特殊的强大的 Claude Code Skills 技能，而是一个可运行的增强型的 Agent 超级大脑。

1. 它能解决什么问题？
   传统的 AI 编程是“你下一条指令，它写一段代码”。而 oh-my-opencode 引入了 Sisyphus（西西弗斯）调度模式：

多代理并行：当你提一个复杂需求时，它会同时唤醒“架构师”、“前端专家”、“文档员”等多个子 Agent 并行工作。

任务死循环（褒义）：它有极强的 TODO 执法能力。任务没过测试、逻辑有 Bug，它会换模型（从 Claude 换到 Gemini 等）反复重试，直到任务彻底 Done。

AST 级重构：普通的搜索替换容易改乱代码，它使用 AST（抽象语法树）进行代码重构，精准度更高。

2. OpenCode 与 Oh My OpenCode：它们是什么关系？
   在深入使用之前，先搞清楚这两个名字的关系，避免混淆。

2.1 OpenCode：基础框架
OpenCode 是一个开源的 AI 编程 Agent 框架，提供了基础的 CLI 工具和核心能力：

命令行工具：@opencode/cli，通过 opencode 命令调用
基础 Agent 能力：任务规划、代码生成、文件操作
可扩展架构：支持插件和自定义扩展
你可以把它理解为"基础版"或"核心引擎"。

2.2 Oh My OpenCode：增强型扩展
Oh My OpenCode（简称 oh-my-opencode）是基于 OpenCode 的增强型扩展包，在基础能力之上增加了：

Sisyphus 调度模式：多 Agent 并行、自动重试、模型路由
AST 级重构：使用抽象语法树进行精准代码修改
ultrawork 模式：通过 ulw 关键词启动高级多 Agent 协同
更强大的错误恢复：任务失败时自动切换模型重试
2.3 关系类比
可以这样理解它们的关系：

类比
OpenCode
Oh My OpenCode
汽车
基础发动机
涡轮增压 + 四驱系统
操作系统
Linux 内核
Ubuntu 发行版
框架
React 核心
Next.js 全栈框架
简单说：OpenCode 是"能跑"，Oh My OpenCode 是"跑得更快、更稳、更智能"。

2.4 安装关系
从安装流程也能看出关系：

# 第一步：安装基础 OpenCode（如果还没有）
npm install -g @opencode/cli

# 第二步：安装增强版 Oh My OpenCode
npx oh-my-opencode install
oh-my-opencode 会基于 OpenCode 进行扩展，添加额外的能力和配置。

2.5 使用时的区别
使用 OpenCode（基础版）：

opencode "帮我写一个函数"
# 单 Agent 执行，基础能力
使用 Oh My OpenCode（增强版）：

opencode "ulw: 帮我重构整个项目的样式系统"
# 多 Agent 并行，自动重试，AST 重构
关键区别：ulw（ultrawork）关键词是 Oh My OpenCode 特有的，用于启动增强模式。

3. 在 Cursor 和 Antigravity 中怎么玩？
   场景 A：在 Cursor 中联动
   Cursor 负责“顺手的 IDE 体验”，oh-my-opencode 负责“深度的逻辑调度”。

前提准备：

安装 Bun：这是运行 oh-my-opencode 的推荐引擎（速度极快）。

curl -fsSL https://bun.sh/install | bash
安装基础版 OpenCode：它是插件的母体。

npm install -g @opencode/cli  # 或者使用你的环境推荐安装方式
运行与唤起流程：

呼出终端：在 Cursor 中按下 `Ctrl + `（或使用菜单栏的 Terminal）打开内置终端。
启动引擎：在终端输入 opencode 并回车。你会看到一个炫酷的命令行交互界面。
下达任务：
方式 A（终端交互）：直接在 opencode 提示符后输入需求。如果你想启动多 Agent 模式，记得带上关键词 ulw（例如：ulw: 重构当前页面的 API 请求逻辑）。
方式 B（快捷指令）：直接在终端运行 opencode "ulw: 你的需求"。
与 Cursor 对话框联动：
后台执行：oh-my-opencode 在终端里埋头干活，你会看到侧边栏自动多出了 task_plan.md 等文件。
状态监控：你不需要盯着终端。直接在 Cursor 的 Chat 对话框（Ctrl+L） 里 @task_plan.md，问 AI：“当前重构进度如何了？有没有遇到什么报错？”
无缝衔接：当终端里的任务打完勾，你就可以在编辑器里直接 Review 它生成的代码，或者让 Cursor 帮你写一段测试来验证。
场景 B：在 Antigravity 中融合
Antigravity 作为一个 Agent-First 的 IDE，可以完美作为 oh-my-opencode 的算力来源。

鉴权：安装 opencode-antigravity-auth 插件。
配置：在 ~/.config/opencode/opencode.json 中配置调用 Antigravity 的模型（如 Gemini 2.0 Flash）。
优势：这样你可以绕过普通 API 的低频率限制，直接享受 Google 给开发者的顶级算力配额。
4. 快速上手步骤
   第一步：环境准备
   确保你的电脑有 node 和 npm（或者 bun，推荐 bun 速度更快）。

# 使用 npx 直接安装
npx oh-my-opencode install
第二步：配置 API Key
它支持多种模型，建议至少配置一个 Claude 或 Gemini 的 Key。配置文件位置：

Mac/Linux: ~/.config/opencode/opencode.json
Windows: %APPDATA%\opencode\opencode.json
第三步：下达“ ultrawork” 指令
在终端输入 opencode 进入交互模式，然后试试这个：

“ultrawork: 帮我重构目前的样式系统，把所有的内联样式全部提取到 CSS Modules 中，并保持响应式布局不变。”

你会发现它不再是直接改文件，而是先规划、再调研、最后分工执行。

5. 鉴权与登录：我需要账号吗？
   这是很多人的疑问：在 IDE 里运行它，需要专门登录吗？答案取决于你的“算力来源”：

情况 A：在 Cursor 中（使用自己的 API Key）
是否需要登录：不需要。
逻辑：oh-my-opencode 只是一个运行在终端的脚本。你只需要在 opencode.json 里填好你自己的 Claude/OpenAI API Key 即可。它直接跟厂商通信，不经过任何第三方登录。
情况 B：在 Antigravity 中（桥接 IDE 算力）
是否需要登录：需要（OAuth 授权）。
逻辑：如果你想“白嫖” Antigravity 的高配模型而不想自己掏钱买 Key，你需要安装 opencode-antigravity-auth 插件。
操作：运行后会自动弹出浏览器让你进行 Google/Antigravity 账号授权。一旦登录成功，你的终端就能直接“借用” IDE 的算力额度。
6. 深度思考：开了这个“外挂”，本质区别在哪？
   从使用角度来看，这个对于我们使用Cursor 和 Antigravity来说，使用oh-my-opencode, 其实就是加个外挂，等同于再开一个AI工具。

你可能会问：既然 Cursor 和 Antigravity 已经自带了 Agent 模式，为什么还要大费周章开这个终端外挂？

本质上，它是从**“单兵作战”升级到了“集团军作战”**：

从“超级个体”到“协同小组”： 直接用 IDE 就像在和一位全能码农聊天；而用它，你是在和一个调度员交流。它会指挥多个子代理并行干活，有的负责架构设计，有的负责写代码，效率是指数级的。
从“短期记忆”到“工程日志”： IDE 的对话框一旦长了容易“降智”。由于它强迫自己写 task_plan.md 和 notes.md，它获得了一种超越 Token 限制的持久记忆。
“不死不休”的执行力： 它内置了多种模型路由。如果 Claude 报错了，它会自动切到 Gemini 甚至是开源模型去尝试，直到任务跑通。这种自主迭代的韧性远超集成式 Agent。
“外科医生级”的精准重构： 它使用 AST（语法树）直接修改代码骨架，而不是简单的字符串替换。这极大地降低了大工程重构时“误伤”代码的概率。
结论：改小 Bug 请继续用 Cursor/Antigravity；处理那种需要动几十个文件、写几百行测试代码的硬骨头时，请务必开启这个“强力外挂”。

7. Oh My OpenCode vs 直接使用 planning-with-files 技能：如何选择？
   既然 oh-my-opencode 内部使用了 planning-with-files 的工作流模式，那么直接使用 planning-with-files 技能和通过 oh-my-opencode 使用有什么区别？什么时候该选哪个？

7.1 核心区别：工具层级与能力范围
维度
直接使用 planning-with-files 技能
使用 Oh My OpenCode
本质定位
工作流模式（Workflow Pattern）
完整的 Agent 调度系统
使用方式
在 Cursor/Claude Code 对话中激活
独立的终端命令行工具
核心能力
三文件持久化（task_plan.md、notes.md、deliverable）
三文件持久化 + 多 Agent 并行 + 模型路由 + AST 重构
执行环境
依赖 IDE 的 AI 助手
独立的进程，可脱离 IDE 运行
学习曲线
低（只需安装技能，在对话中触发）
中（需要配置 CLI、API Key、理解命令）
7.2 功能对比矩阵
直接使用 planning-with-files 技能
优势：

✅ 零配置启动：安装技能后，在对话中直接说"使用 planning-with-files 模式"即可
✅ 与 IDE 深度集成：直接在 Cursor/Claude Code 的对话框中使用，无需切换终端
✅ 轻量级：只占用对话上下文，不启动额外进程
✅ 灵活可控：你可以随时介入，修改 task_plan.md，调整 AI 的执行方向
✅ 适合中小型任务：对于需要 2-5 个步骤的复杂任务，技能模式足够高效
劣势：

❌ 单 Agent 执行：只能使用当前对话的 AI 模型，无法并行调用多个 Agent
❌ 无自动重试机制：如果任务失败，需要你手动提醒 AI 重试
❌ 无模型路由：无法在 Claude、Gemini、GPT 之间自动切换
❌ 无 AST 级重构：代码修改依赖 AI 的文本理解，可能不够精准
❌ 受对话上下文限制：虽然使用文件持久化，但仍受 IDE 对话窗口的 Token 限制
典型场景：

写一篇技术博客（需要调研、整理、写作）
重构单个模块的代码（5-10 个文件）
深度分析某个技术栈（需要多轮调研和对比）
生成一份项目文档（需要收集信息、结构化输出）
使用 Oh My OpenCode
优势：

✅ 多 Agent 并行：同时唤醒"架构师"、"前端专家"、"测试工程师"等多个角色
✅ 自动重试与模型路由：任务失败时自动切换模型（Claude → Gemini → GPT），直到成功
✅ AST 级精准重构：使用抽象语法树修改代码，避免字符串替换的误伤
✅ 独立进程运行：不占用 IDE 对话窗口，可以后台长时间运行
✅ 真正的"不死不休"：内置 TODO 执法机制，任务不完成不停止
✅ 适合大型项目：处理需要动几十个文件、涉及多模块协作的复杂任务
劣势：

❌ 配置复杂：需要安装 CLI、配置 API Key、理解命令参数
❌ 学习曲线陡：需要理解 ultrawork、ulw 等命令的含义
❌ 脱离 IDE 体验：在终端中运行，与 IDE 的集成度不如直接对话
❌ 资源消耗大：多 Agent 并行会消耗更多 Token 和 API 调用
❌ 调试困难：终端输出可能不够直观，需要查看生成的文件来了解进度
典型场景：

从零构建完整项目（需要架构设计、多模块开发、测试、文档）
大规模代码重构（涉及 50+ 文件，需要保持一致性）
复杂的多步骤任务（需要多轮迭代、错误恢复、模型切换）
需要"外包团队"级别的自动化（你只提需求，它负责全部执行）
7.3 决策树：我该选哪个？



7.4 实际案例对比
案例 1：重构单个组件的样式系统
任务：将 React 组件中的内联样式提取到 CSS Modules，涉及 3 个文件。

方案 A：直接使用 planning-with-files 技能

在 Cursor 中：
"使用 planning-with-files 模式，帮我重构 Button 组件的样式系统，
把内联样式提取到 CSS Modules。"

→ AI 创建 task_plan.md
→ AI 分析代码，记录到 notes.md
→ AI 执行重构，更新 task_plan.md
→ 完成（耗时 5 分钟）
方案 B：使用 Oh My OpenCode

在终端中：
opencode "ulw: 重构 Button 组件的样式系统"

→ 启动多 Agent（架构师分析、前端专家执行、测试员验证）
→ 创建 task_plan.md、notes.md
→ AST 级重构
→ 完成（耗时 8 分钟，但过度设计）
结论：方案 A 更合适。任务简单，不需要多 Agent 和 AST 重构。

案例 2：从零构建一个全栈应用
任务：构建一个包含前端、后端、数据库、API 的完整应用，涉及 50+ 文件。

方案 A：直接使用 planning-with-files 技能

在 Cursor 中：
"使用 planning-with-files 模式，帮我构建一个待办事项应用..."

→ AI 创建 task_plan.md
→ AI 开始规划，但受对话上下文限制
→ 执行到一半，AI 开始"降智"，忘记之前的决策
→ 需要你频繁提醒和纠正（耗时 2 小时，且质量不稳定）
方案 B：使用 Oh My OpenCode

在终端中：
opencode "ulw: 构建一个待办事项全栈应用，包含用户认证、CRUD、实时同步"

→ 多 Agent 并行：架构师设计、前端开发、后端开发、测试工程师
→ 自动创建 task_plan.md，拆解 20+ 个 Phase
→ 遇到错误自动重试，切换模型
→ AST 级重构保证代码一致性
→ 完成（耗时 1.5 小时，质量稳定）
结论：方案 B 更合适。大型项目需要多 Agent 协作和自动错误恢复。

7.5 最佳实践：组合使用
实际上，两者并不互斥，可以组合使用：

日常开发：在 Cursor 中直接使用 planning-with-files 技能处理中小型任务
大型项目：使用 oh-my-opencode 处理需要多 Agent 协作的复杂任务
混合模式：先用 oh-my-opencode 生成项目骨架，再用 planning-with-files 技能在 IDE 中细化功能
示例工作流：

# 第一步：用 OpenCode 生成项目骨架
opencode "ulw: 创建一个 React + TypeScript + Vite 项目，包含路由、状态管理、UI 组件库"

# 第二步：在 Cursor 中使用 planning-with-files 技能细化功能
# 在 Cursor 对话框中：
"使用 planning-with-files 模式，帮我实现用户登录功能，包括表单验证、API 调用、错误处理"
7.6 总结对比表
选择标准
直接使用 planning-with-files 技能
使用 Oh My OpenCode
任务规模
中小型（2-10 个步骤）
大型（10+ 步骤，多模块）
执行方式
单 Agent，对话式
多 Agent，并行执行
错误处理
手动提醒重试
自动重试 + 模型路由
代码重构
文本级修改
AST 级精准重构
学习成本
低（安装即用）
中（需要理解命令）
适用人群
日常开发者
需要处理大型项目的开发者
推荐场景
调研、文档、小重构
从零构建、大规模重构、复杂自动化
一句话建议：小任务用技能，大项目用工具。 如果你不确定，先用 planning-with-files 技能试试，如果发现 AI 开始"降智"或任务过于复杂，再切换到 oh-my-opencode。

8. 为什么你应该用它？
   拒绝“降智”：长对话后 AI 容易忘事，它通过 planning-with-files 将进度固化在文件里，断网重启也能接上。
   节省 Token：由于子任务被打散，模型不需要每次都吞下整个项目的全量代码，运行效率更高。
   真正的自动化：它是目前市面上最接近“我只提需求，你负责交付全套代码”的产品。
   总结
1. OpenCode 可以是 Claude Code 的平替
   如果你没有 Claude Code 的访问与使用权限（国内不够友好），oh-my-opencode 提供了一个很好的替代方案。它同样支持多 Agent 协同、持久化记忆、自动错误恢复等核心能力，而且完全开源，可以自由定制和扩展。

2. 适合复杂任务，不适合小打小闹
   oh-my-opencode 的价值在于处理大型复杂任务（50+ 文件、多模块协作、需要自动重试的场景）。对于改个小 Bug、调个样式这种简单任务，直接用 Cursor 对话就够了，没必要启动这个"重型武器"。

3. 先试技能，再上工具
   建议先用 planning-with-files 技能处理中等规模的任务。如果发现 AI 开始"降智"、频繁忘记决策、或者需要多 Agent 并行时，再考虑使用 oh-my-opencode。这样既能避免过度设计，也能在真正需要的时候发挥最大价值。


