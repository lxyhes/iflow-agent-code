// 公众号爆款文章生成服务
// 基于 GitHub 项目真实信息生成高传播力文章

class ArticleGenerator {
  constructor() {
    this.templates = {
      // 爆款标题模板 - 制造好奇心和紧迫感
      title: [
        '🚀 刚发现！{name} 用 {stars} Star 证明了{language}还能这么玩',
        '🔥 卧槽！{name} 竟然有 {stars} Star，我直接跪了',
        '💡 同事偷偷用的{name}，让我效率翻了3倍',
        '⚠️ 警告：看完{name}，你可能会想重构所有代码',
        '🎯 {name}：那个让{language}开发者疯狂点赞的项目',
        '🚀 本周 GitHub 霸榜！{name} 凭什么这么火？',
        '💪 从0到{stars} Star，{name} 的逆袭之路',
        '🔥 实测{name}后，我把之前的工具全卸载了',
        '⚡ 这个{name}，让我每天提前2小时下班',
        '📈 {language}开发者必看：{name} 正在改变游戏规则',
      ],
      // 爆款开头钩子 - 3秒抓住读者
      hooks: [
        '说实话，第一次看到{name}的时候，我是不屑的。\n\n又一个{language}工具？GitHub上{stars} Star？肯定又是刷的。\n\n但当我真正用起来，我只想说：**为什么没早点发现！**',
        '你有没有遇到过这种情况：{problem}\n\n我曾经为此加班到深夜，直到发现了{name}。\n\n**用了3天，我彻底服了。**',
        '昨天，我那个在大厂做架构师的朋友突然问我："你知道{name}吗？"\n\n我说不知道。他回了我一句：**"那你 out 了，我们团队已经全面迁移了。"**\n\n好奇心驱使下，我研究了一下，结果...',
        'GitHub 上有个项目，{contributors}位开发者贡献了{commits}次提交，拿下了{stars} Star。\n\n它就是{name}。\n\n今天，我要告诉你为什么这么多人为它疯狂。',
        '作为一个{role}，我见过太多"号称改变行业"的工具。\n\n但{name}不一样。\n\n**它是真的在解决问题，而且解决得极其优雅。**',
      ],
      // 痛点共鸣
      painPoints: {
        'JavaScript': [
          '回调地狱让你怀疑人生',
          'npm 依赖地狱，node_modules 比黑洞还深',
          '异步代码调试到崩溃',
          '框架更新速度比学习速度还快',
        ],
        'TypeScript': [
          '类型定义写起来像写八股文',
          '编译错误提示让人摸不着头脑',
          '泛型嵌套三层就看不懂了',
          '类型体操比算法还难',
        ],
        'Python': [
          'pip 依赖冲突家常便饭',
          '性能瓶颈想优化却无从下手',
          'GIL 锁让多线程成了笑话',
          '虚拟环境管理一团糟',
        ],
        'Go': [
          '错误处理 if err != nil 写到手软',
          '缺少泛型时代码重复率极高',
          '包管理曾经是个灾难',
          '调试工具不如其他语言丰富',
        ],
        'Rust': [
          '编译器报错像写论文一样长',
          '所有权概念让新手望而生畏',
          '编译速度慢得让人想喝茶',
          '生命周期标注像解谜题',
        ],
        'Java': [
          'Spring 配置繁琐到想骂人',
          'Maven/Gradle 依赖冲突家常便饭',
          '启动慢得像在开机',
          '样板代码多到能出书',
        ],
      },
      // 解决方案描述
      solutions: {
        'JavaScript': [
          '现在只需要3行代码，优雅得不像话',
          'API 设计如此直觉化，5分钟就能上手',
          '性能提升肉眼可见，用户体验直接起飞',
        ],
        'TypeScript': [
          '类型推断太智能了，写起来行云流水',
          'IDE 提示精准到离谱，开发体验拉满',
          '重构时信心满满，再也不怕改崩了',
        ],
        'Python': [
          '代码简洁得像在写伪代码',
          '性能优化如此简单，我惊了',
          '自动化程度之高，让我怀疑之前都在手动搬砖',
        ],
        'Go': [
          '并发编程变得如此简单，goroutine 真香',
          '部署只有一个二进制文件，太爽了',
          '性能强劲，资源占用还低',
        ],
        'Rust': [
          '零成本抽象不是吹的，性能和安全兼得',
          '编译器虽然严格，但出错率直线下降',
          '一旦编译通过，运行时几乎不会崩',
        ],
        'Java': [
          '配置简化到令人发指，开箱即用',
          '启动速度快了好几倍，开发效率飙升',
          '代码量减少一半，维护成本大幅降低',
        ],
      },
      // 情绪价值语句
      emotions: [
        '说实话，这种丝滑的体验，让我重新燃起了对编程的热爱。',
        '用了之后我只想说：之前的日子都白过了。',
        '这才是工具应该有的样子，简单、强大、优雅。',
        '我已经推荐给了整个团队，反响都特别好。',
        '如果你还没用过，真的建议试试看，绝对不会后悔。',
      ],
      // 社交证明
      socialProof: [
        '不只是我，看看 GitHub 上{stars}个 Star，{forks}个 Fork，就知道有多火了。',
        '连{contributors}位开源贡献者都在持续维护，质量有保障。',
        '从{createdDate}创建到现在，已经被无数开发者验证过。',
        '看看这更新频率，{lastUpdate}还在迭代，活跃度拉满。',
      ],
      // 行动号召
      ctas: [
        '别犹豫了，赶紧去 GitHub 上点个 Star，体验一下什么叫真正的效率工具。',
        '现在就去试试，相信我，你会回来感谢我的。',
        '这么好的工具，不分享出去真的说不过去。',
        '点击阅读原文，给{name}一个机会，也给自己一个效率翻倍的机会。',
      ],
    };
  }

  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatDate(dateString) {
    if (!dateString) return '不久前';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  }

  extractReadmeInfo(readmeContent) {
    if (!readmeContent) return null;

    const lines = readmeContent.split('\n');
    const features = [];
    let installCommand = '';
    let usageExample = '';
    let tagline = '';

    // 提取项目口号/简介
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && 
          !trimmed.startsWith('[') && trimmed.length < 150) {
        tagline = trimmed;
        break;
      }
    }

    // 提取特性/功能列表
    const featureSectionMatch = readmeContent.match(/#{1,3}\s*(features|特性|功能|特点|highlights|overview)/i);
    
    if (featureSectionMatch) {
      const startIdx = readmeContent.indexOf(featureSectionMatch[0]);
      const sectionContent = readmeContent.substring(startIdx, startIdx + 2000);
      
      const listMatches = sectionContent.match(/[-*•]\s+(.+?)(?=\n|$)/g);
      if (listMatches) {
        listMatches.slice(0, 5).forEach(match => {
          const feature = match.replace(/^[-*•]\s+/, '').trim();
          if (feature.length > 10 && feature.length < 120 && !feature.includes('http')) {
            features.push(feature);
          }
        });
      }
      
      if (features.length === 0) {
        const emojiMatches = sectionContent.match(/[\u{1F300}-\u{1F9FF}]\s+(.+?)(?=\n|$)/gu);
        if (emojiMatches) {
          emojiMatches.slice(0, 5).forEach(match => {
            const feature = match.replace(/^[\u{1F300}-\u{1F9FF}]\s+/u, '').trim();
            if (feature.length > 10 && feature.length < 120) {
              features.push(feature);
            }
          });
        }
      }
    }

    if (features.length === 0) {
      const allListMatches = readmeContent.match(/[-*]\s+(.+?)(?=\n|$)/g);
      if (allListMatches) {
        allListMatches.slice(0, 8).forEach(match => {
          const feature = match.replace(/^[-*]\s+/, '').trim();
          if (feature.length > 15 && feature.length < 100 && 
              !feature.startsWith('[') && !feature.includes('http')) {
            features.push(feature);
          }
        });
      }
    }

    // 提取安装命令
    const installSectionMatch = readmeContent.match(/#{1,3}\s*(installation|安装|getting started|快速开始|install)/i);
    if (installSectionMatch) {
      const startIdx = readmeContent.indexOf(installSectionMatch[0]);
      const sectionContent = readmeContent.substring(startIdx, startIdx + 1500);
      
      const codeBlockMatch = sectionContent.match(/```(?:bash|sh|shell|console)?\n((?:npm|yarn|pnpm|pip|go|cargo|brew|apt|docker)[^`]+)/i);
      if (codeBlockMatch) {
        installCommand = codeBlockMatch[1].trim();
      }
    }
    
    if (!installCommand) {
      const installPatterns = [
        /```(?:bash|sh|shell)?\n(npm install [^`]+)/,
        /```(?:bash|sh|shell)?\n(yarn add [^`]+)/,
        /```(?:bash|sh|shell)?\n(pip install [^`]+)/,
        /```(?:bash|sh|shell)?\n(go get [^`]+)/,
        /```(?:bash|sh|shell)?\n(cargo install [^`]+)/,
        /```(?:bash|sh|shell)?\n(git clone [^`]+)/,
      ];
      
      for (const pattern of installPatterns) {
        const match = readmeContent.match(pattern);
        if (match) {
          installCommand = match[1].trim();
          break;
        }
      }
    }

    // 提取使用示例
    const usageSectionMatch = readmeContent.match(/#{1,3}\s*(usage|使用|example|示例|quick start|getting started)/i);
    if (usageSectionMatch) {
      const startIdx = readmeContent.indexOf(usageSectionMatch[0]);
      const sectionContent = readmeContent.substring(startIdx, startIdx + 2000);
      
      const codeBlockMatch = sectionContent.match(/```(?:javascript|js|typescript|ts|python|py|go|rust|java|jsx|tsx)?\n([^`]+)```/);
      if (codeBlockMatch) {
        usageExample = codeBlockMatch[1].trim();
      }
    }
    
    if (!usageExample) {
      const codeMatch = readmeContent.match(/```(?:javascript|js|typescript|ts|python|py|go|rust|java)?\n([^`]{50,500})```/);
      if (codeMatch) {
        usageExample = codeMatch[1].trim();
      }
    }

    return {
      features: features.slice(0, 5),
      installCommand,
      usageExample,
      tagline,
    };
  }

  generateTitle(repo, details) {
    const templates = this.templates.title;
    const template = this.randomChoice(templates);
    
    const description = details?.readmePreview || repo.description || '开源项目';
    const shortDesc = description.length > 30 ? description.substring(0, 30) + '...' : description;
    
    return template
      .replace('{name}', repo.name)
      .replace('{stars}', this.formatNumber(repo.stars || details?.stars || 0))
      .replace('{language}', repo.language || '开源')
      .replace('{description}', shortDesc)
      .replace('{contributors}', details?.topContributors?.length || '多位');
  }

  generateHook(repo, details) {
    const templates = this.templates.hooks;
    const template = this.randomChoice(templates);
    
    const lang = repo.language || '开源';
    const painPoints = this.templates.painPoints[lang] || ['重复繁琐的开发工作', '低效的编程体验'];
    const solutions = this.templates.solutions[lang] || ['现在只需要几分钟就能完成', '效率提升明显'];
    
    return template
      .replace('{name}', repo.name)
      .replace('{stars}', this.formatNumber(repo.stars || details?.stars || 0))
      .replace('{language}', lang)
      .replace('{role}', this.randomChoice(['程序员', '开发者', '工程师', '技术负责人', 'CTO']))
      .replace('{problem}', this.randomChoice(painPoints))
      .replace('{solution}', this.randomChoice(solutions))
      .replace('{contributors}', details?.topContributors?.length || '多位')
      .replace('{commits}', this.formatNumber(details?.commits || 100))
      .replace('{createdDate}', this.formatDate(details?.createdAt));
  }

  generateEmotionSection(repo, details) {
    const emotions = this.templates.emotions;
    const socialProof = this.templates.socialProof;
    
    const lang = repo.language || '开源';
    const stars = details?.stars || repo.stars || 0;
    const forks = details?.forks || repo.forks || 0;
    
    let section = '';
    
    // 添加情绪价值
    section += this.randomChoice(emotions) + '\n\n';
    
    // 添加社交证明
    const proof = this.randomChoice(socialProof)
      .replace('{stars}', this.formatNumber(stars))
      .replace('{forks}', this.formatNumber(forks))
      .replace('{contributors}', details?.topContributors?.length || '多位')
      .replace('{commits}', this.formatNumber(details?.commits || 100))
      .replace('{createdDate}', this.formatDate(details?.createdAt))
      .replace('{lastUpdate}', this.formatDate(details?.pushedAt));
    
    section += proof;
    
    return section;
  }

  generateHighlights(repo, details) {
    const highlights = [];
    const readmeInfo = this.extractReadmeInfo(details?.readmeContent);
    const lang = repo.language || details?.language || '开源';

    // 基于真实特性的亮点
    if (readmeInfo?.features && readmeInfo.features.length > 0) {
      readmeInfo.features.slice(0, 3).forEach((feature, i) => {
        const titleMatch = feature.match(/^([^：:-]+)/);
        const title = titleMatch ? titleMatch[1].trim().substring(0, 15) : `核心特性 ${i + 1}`;
        
        highlights.push({
          title: title,
          desc: feature.substring(0, 100),
          emoji: ['✨', '🚀', '💡', '⚡', '🔥'][i % 5],
        });
      });
    }

    // 社区认可度
    const stars = details?.stars || repo.stars || 0;
    if (stars > 1000) {
      const forks = details?.forks || repo.forks || 0;
      let popularity = '💡 值得关注';
      if (stars > 50000) popularity = '🔥 超级热门';
      else if (stars > 10000) popularity = '⭐ 非常受欢迎';
      else if (stars > 5000) popularity = '👍 广受好评';
      
      highlights.push({
        title: popularity,
        desc: `获得 ${this.formatNumber(stars)} Star，被 ${this.formatNumber(forks)} 个开发者 Fork`,
        emoji: '📈',
      });
    }

    // 维护状态
    if (details?.pushedAt) {
      const lastUpdate = this.formatDate(details.pushedAt);
      const lastPush = new Date(details.pushedAt);
      const daysSince = Math.floor((Date.now() - lastPush) / (1000 * 60 * 60 * 24));
      
      let maintenanceStatus = '✅ 持续维护';
      if (daysSince < 7) maintenanceStatus = '🚀 最近更新';
      else if (daysSince < 30) maintenanceStatus = '✨ 本月活跃';
      
      highlights.push({
        title: maintenanceStatus,
        desc: `最后更新于 ${lastUpdate}，项目${daysSince < 30 ? '持续迭代中' : '保持稳定维护'}`,
        emoji: '🔄',
      });
    }

    // 贡献者社区
    if (details?.topContributors && details.topContributors.length > 0) {
      const topContributor = details.topContributors[0];
      const totalContributions = details.topContributors.reduce((sum, c) => sum + c.contributions, 0);
      
      highlights.push({
        title: '👥 活跃社区',
        desc: `@${topContributor.username} 等 ${details.topContributors.length}+ 位贡献者共提交 ${totalContributions}+ 次`,
        emoji: '🤝',
      });
    }

    // 开源协议
    if (details?.license) {
      let licenseDesc = '可放心用于商业项目';
      let emoji = '📄';
      if (details.license.includes('MIT')) {
        licenseDesc = 'MIT协议，商业友好，使用无限制';
        emoji = '✅';
      } else if (details.license.includes('Apache')) {
        licenseDesc = 'Apache 2.0协议，专利保护';
        emoji = '🛡️';
      } else if (details.license.includes('GPL')) {
        licenseDesc = 'GPL协议，开源共享';
        emoji = '🔗';
      }
      
      highlights.push({
        title: `${emoji} 开源协议`,
        desc: `采用 ${details.license}，${licenseDesc}`,
        emoji,
      });
    }

    // 语言特色
    if (lang && lang !== '开源') {
      const langFeatures = {
        'JavaScript': { title: '⚡ JavaScript生态', desc: '前端开发必备，丰富的npm生态支持', emoji: '🟨' },
        'TypeScript': { title: '🔒 TypeScript支持', desc: '类型安全，更好的IDE支持和可维护性', emoji: '🔷' },
        'Python': { title: '🐍 Python友好', desc: '简洁优雅，数据科学和AI领域的首选', emoji: '🐍' },
        'Go': { title: '🚀 Go语言高性能', desc: '编译型语言，并发性能出色，部署简单', emoji: '🐹' },
        'Rust': { title: '⚙️ Rust安全可靠', desc: '内存安全零开销，系统级编程首选', emoji: '🦀' },
        'Java': { title: '☕ Java企业级', desc: '成熟稳定，企业级应用开发首选', emoji: '☕' },
        'Vue': { title: '💚 Vue生态', desc: '渐进式框架，组件化开发体验优秀', emoji: '💚' },
        'React': { title: '⚛️ React生态', desc: '组件化开发，虚拟DOM高效渲染', emoji: '⚛️' },
      };
      
      if (langFeatures[lang] && highlights.length < 6) {
        highlights.push(langFeatures[lang]);
      }
    }

    return highlights.slice(0, 6);
  }

  generateCases(repo, details) {
    const cases = [];
    const readmeInfo = this.extractReadmeInfo(details?.readmeContent);
    const lang = repo.language || details?.language || '开源';
    
    // 基于README真实特性生成案例
    if (readmeInfo?.features && readmeInfo.features.length > 0) {
      readmeInfo.features.slice(0, 2).forEach((feature, i) => {
        const actionMatch = feature.match(/(?:支持|提供|实现|可以|能够|自动|快速|简单)(.+?)(?:，|。|$)/);
        const action = actionMatch ? actionMatch[1].trim() : feature.substring(0, 30);
        
        cases.push({
          title: `场景 ${i + 1}：${action.substring(0, 20)}`,
          before: this.generateBeforeScenario(lang, feature),
          after: feature,
          improvement: this.generateImprovement(lang),
          emoji: ['😫', '😤'][i],
        });
      });
    }

    // 基于项目统计数据生成案例
    if (cases.length < 2 && details?.stars > 100) {
      cases.push({
        title: '场景：技术选型',
        before: '担心项目不成熟，不敢在生产环境使用',
        after: `${this.formatNumber(details.stars)}+ Star，${details.topContributors?.length || '多位'}核心贡献者持续维护`,
        improvement: '生产环境稳定运行，社区活跃支持',
        emoji: '🤔',
      });
    }

    // 基于最后更新时间生成案例
    if (cases.length < 3 && details?.pushedAt) {
      const lastUpdate = this.formatDate(details.pushedAt);
      cases.push({
        title: '场景：长期维护',
        before: '项目无人维护，bug 无人修复，安全漏洞无人处理',
        after: `最后更新于 ${lastUpdate}，持续迭代中，问题响应及时`,
        improvement: '安心使用，问题能得到及时解决',
        emoji: '😰',
      });
    }

    // 补充通用案例
    if (cases.length < 2) {
      cases.push({
        title: `场景：${lang}开发`,
        before: `传统${lang}项目需要大量配置和依赖，环境搭建就要半天`,
        after: `${repo.name} 提供开箱即用的解决方案，5分钟上手`,
        improvement: '节省 70% 的配置时间，专注业务开发',
        emoji: '😩',
      });
    }

    if (cases.length < 3) {
      cases.push({
        title: '场景：团队协作',
        before: '代码风格不统一，review 效率低，新人上手慢',
        after: `${this.formatNumber(details?.stars || repo.stars || 0)}+ 开发者已验证的最佳实践`,
        improvement: '团队开发效率提升，代码质量有保障',
        emoji: '😓',
      });
    }

    return cases.slice(0, 3);
  }

  generateBeforeScenario(lang, feature) {
    const scenarios = {
      'JavaScript': [
        '需要手动处理复杂的异步逻辑和回调，代码嵌套得像金字塔',
        'npm 依赖冲突家常便饭，node_modules 动不动就几个G',
        '调试异步代码像破案，console.log 打得到处都是',
      ],
      'TypeScript': [
        '类型定义写起来像写八股文，any 类型到处飞',
        '编译错误提示让人摸不着头脑，改来改去还是报错',
        '泛型嵌套三层就看不懂了，类型体操比算法还难',
      ],
      'Python': [
        'pip 依赖冲突家常便饭，虚拟环境管理一团糟',
        '性能瓶颈想优化却无从下手，只能干瞪眼',
        '脚本写得冗长，重复代码多到能出书',
      ],
      'Go': [
        '错误处理 if err != nil 写到手软，代码里一半都是错误处理',
        '缺少泛型时代码重复率极高，复制粘贴到手软',
        '并发编程复杂，channel 用不好就死锁',
      ],
      'Rust': [
        '编译器报错像写论文一样长，看不懂错在哪里',
        '所有权概念让新手望而生畏，编译通过像中彩票',
        '生命周期标注像解谜题，borrow checker 让人崩溃',
      ],
      'Java': [
        'Spring 配置繁琐到想骂人，XML 文件写到手软',
        'Maven/Gradle 依赖冲突家常便饭，解决冲突比写代码还久',
        '启动慢得像在开机，改一行代码等半天',
      ],
    };
    const langScenarios = scenarios[lang] || ['传统方式需要大量配置和代码', '重复繁琐的开发工作'];
    return this.randomChoice(langScenarios);
  }

  generateImprovement(lang) {
    const improvements = {
      'JavaScript': [
        '代码量减少 60%，可读性大幅提升，维护轻松多了',
        '异步处理如此优雅，Promise 链式调用像写诗',
        '性能提升肉眼可见，用户体验直接起飞',
      ],
      'TypeScript': [
        '类型推断太智能了，写起来行云流水',
        'IDE 提示精准到离谱，开发体验拉满',
        '重构时信心满满，再也不怕改崩了',
      ],
      'Python': [
        '代码简洁得像在写伪代码，Pythonic 到极致',
        '性能优化如此简单，我惊了',
        '自动化程度之高，让我怀疑之前都在手动搬砖',
      ],
      'Go': [
        '并发编程变得如此简单，goroutine 真香',
        '部署只有一个二进制文件，太爽了',
        '性能强劲，资源占用还低',
      ],
      'Rust': [
        '零成本抽象不是吹的，性能和安全兼得',
        '编译器虽然严格，但出错率直线下降',
        '一旦编译通过，运行时几乎不会崩',
      ],
      'Java': [
        '配置简化到令人发指，开箱即用',
        '启动速度快了好几倍，开发效率飙升',
        '代码量减少一半，维护成本大幅降低',
      ],
    };
    const langImprovements = improvements[lang] || ['开发效率提升 80%', '代码质量显著提升'];
    return this.randomChoice(langImprovements);
  }

  generateQuickStart(repo, details) {
    const readmeInfo = this.extractReadmeInfo(details?.readmeContent);
    const lang = repo.language || details?.language;
    const fullName = repo.fullName || repo.full_name;
    
    // 使用README中的安装命令
    let install = readmeInfo?.installCommand;
    if (!install) {
      const installCommands = {
        'JavaScript': `# 使用 npm
npm install ${repo.name.toLowerCase()}

# 或者使用 yarn
yarn add ${repo.name.toLowerCase()}`,
        'TypeScript': `# 使用 npm
npm install ${repo.name.toLowerCase()}

# 或者使用 yarn  
yarn add ${repo.name.toLowerCase()}`,
        'Python': `# 使用 pip
pip install ${repo.name.toLowerCase()}

# 或者使用 pip3
pip3 install ${repo.name.toLowerCase()}`,
        'Go': `# 安装包
go get github.com/${fullName}

# 或者使用 go install
go install github.com/${fullName}@latest`,
        'Rust': `# 使用 cargo
cargo install ${repo.name.toLowerCase()}`,
        'Java': `# Maven
<dependency>
    <groupId>${fullName.split('/')[0]}</groupId>
    <artifactId>${repo.name.toLowerCase()}</artifactId>
    <version>${details?.latestRelease?.tagName || 'latest'}</version>
</dependency>

# 或者 Gradle
implementation '${fullName}:${details?.latestRelease?.tagName || 'latest'}'`,
        'Ruby': `gem install ${repo.name.toLowerCase()}`,
        'PHP': `composer require ${fullName.toLowerCase()}`,
      };
      install = installCommands[lang] || `# 克隆仓库
git clone ${repo.htmlUrl || details?.htmlUrl}
cd ${repo.name}

# 查看项目文档获取详细安装说明`;
    }

    // 使用README中的使用示例
    let usage = readmeInfo?.usageExample;
    if (!usage) {
      const usageExamples = {
        'JavaScript': `// 导入库
import { ${repo.name} } from '${repo.name.toLowerCase()}';

// 创建实例（配置超简单）
const client = new ${repo.name}({
  // 默认配置就能用，也可以自定义
});

// 开始使用 - 就是这么简单！
const result = await client.process();
console.log(result);`,
        'TypeScript': `import { ${repo.name} } from '${repo.name.toLowerCase()}';

// 创建实例 - TypeScript 会自动推断类型
const client = new ${repo.name}();

// 使用 - IDE 提示超智能
const result = await client.process();

// result 的类型自动推断，无需手动定义`,
        'Python': `import ${repo.name.toLowerCase().replace(/-/g, '_')}

# 创建实例
client = ${repo.name}()

# 使用 - 简洁优雅
result = client.process()
print(result)`,
        'Go': `package main

import (
    "github.com/${fullName}"
)

func main() {
    // 创建实例
    client := ${repo.name}.New()
    
    // 使用
    result, err := client.Process()
    if err != nil {
        // 错误处理
    }
}`,
        'Rust': `use ${repo.name.toLowerCase().replace(/-/g, '_')};

fn main() {
    // 创建实例
    let client = ${repo.name}::new();
    
    // 使用
    let result = client.process();
    println!("{:?}", result);
}`,
        'Java': `import com.${fullName.split('/')[0]}.${repo.name};

public class Main {
    public static void main(String[] args) {
        // 创建实例
        ${repo.name} client = new ${repo.name}();
        
        // 使用
        Result result = client.process();
        System.out.println(result);
    }
}`,
      };
      usage = usageExamples[lang] || `// 查看项目文档获取详细使用说明
// ${repo.htmlUrl || details?.htmlUrl}`;
    }

    return { install, usage };
  }

  generateTestimonials(repo, details) {
    const testimonials = [];
    const lang = repo.language || details?.language || '开源';
    
    // 基于真实贡献者生成评价
    if (details?.topContributors && details.topContributors.length > 0) {
      const contributorComments = [
        `这个${lang}项目的代码质量太高了，架构设计值得学习！`,
        `解决了我工作中的大难题，${lang}开发者必备！`,
        `API设计非常优雅，用起来很顺手，文档也很详细。`,
        `作为${lang}开发者，这个项目让我的效率提升了一倍！`,
        `社区氛围很好，有问题都能得到及时回复。`,
      ];
      
      details.topContributors.slice(0, 2).forEach((contributor, i) => {
        const contributionCount = contributor.contributions;
        let contributionDesc = '活跃贡献者';
        if (contributionCount > 100) contributionDesc = '核心维护者';
        else if (contributionCount > 50) contributionDesc = '主要贡献者';
        
        testimonials.push({
          role: `${contributionDesc} @${contributor.username}`,
          content: contributorComments[i] || contributorComments[0],
          avatarUrl: contributor.avatarUrl,
          contributions: contributionCount,
          verified: true,
        });
      });
    }

    // 基于项目特点生成评价
    const langSpecificComments = {
      'JavaScript': [
        { role: '前端工程师 @阿里', content: '用了这个项目后，组件开发效率提升了3倍！已经推荐给整个团队。', verified: false },
        { role: '全栈开发者 @字节', content: 'API设计非常人性化，比同类库好用太多了，源码也值得学习。', verified: false },
      ],
      'TypeScript': [
        { role: '高级前端 @腾讯', content: '类型定义非常完善，IDE提示很友好，大型项目维护轻松多了。', verified: false },
        { role: '架构师 @美团', content: '类型安全让重构变得轻松，强烈推荐！我们项目已经全面采用。', verified: false },
      ],
      'Python': [
        { role: '数据工程师 @百度', content: '数据处理效率提升明显，代码也更简洁了，数据处理首选！', verified: false },
        { role: '后端开发 @滴滴', content: 'Python开发者必备工具，省了很多重复工作，生产力神器。', verified: false },
      ],
      'Go': [
        { role: '后端架构师 @小米', content: '并发性能出色，生产环境运行很稳定，微服务首选。', verified: false },
        { role: '云原生工程师 @华为', content: '内存占用低，性能优异，部署简单，云原生场景完美适配。', verified: false },
      ],
      'Rust': [
        { role: '系统工程师 @PingCAP', content: '内存安全零开销，性能媲美C++但更安心，系统编程首选。', verified: false },
        { role: '开源贡献者', content: 'Rust生态的精品项目，代码质量极高，学习Rust必看。', verified: false },
      ],
      'Java': [
        { role: '企业级开发 @京东', content: 'Spring Boot集成很顺畅，配置也简单，企业级应用首选。', verified: false },
        { role: '技术负责人 @网易', content: '团队接入成本低，文档详细，适合大规模使用，稳定性很好。', verified: false },
      ],
    };

    const specificComments = langSpecificComments[lang];
    if (specificComments) {
      specificComments.forEach(comment => {
        if (testimonials.length < 3) {
          testimonials.push(comment);
        }
      });
    }

    // 补充通用评价
    const genericTestimonials = [
      { role: '大厂程序员 @某互联网大厂', content: '用了这个项目后，我每天提前2小时下班！效率提升太明显了。', verified: false },
      { role: '创业公司 CTO', content: '团队效率提升明显，已经用在生产环境了，稳定性很好。', verified: false },
      { role: '独立开发者', content: '这是我今年发现的最有价值的开源项目！省了我好多时间。', verified: false },
      { role: '开源爱好者', content: `${this.formatNumber(details?.stars || repo.stars || 0)}+ Star 不是没道理的，确实好用，源码也值得学习。`, verified: false },
    ];

    while (testimonials.length < 3) {
      testimonials.push(genericTestimonials[testimonials.length]);
    }

    return testimonials.slice(0, 3);
  }

  generateTags(repo, details) {
    const tags = ['GitHub', '开源项目'];
    const lang = repo.language || details?.language;
    
    if (lang) tags.push(lang);
    
    if (details?.topics && details.topics.length > 0) {
      tags.push(...details.topics.slice(0, 3));
    } else if (repo.topics && repo.topics.length > 0) {
      tags.push(...repo.topics.slice(0, 3));
    }
    
    const stars = details?.stars || repo.stars || 0;
    if (stars > 50000) tags.push('🔥热门项目', '明星项目');
    else if (stars > 10000) tags.push('🔥热门项目');
    else if (stars > 1000) tags.push('⭐值得关注');
    
    const license = details?.license || repo.license;
    if (license) {
      if (license.includes('MIT')) tags.push('MIT协议');
      else if (license.includes('Apache')) tags.push('Apache协议');
      else if (license.includes('GPL')) tags.push('GPL协议');
    }
    
    if (details?.isFork) tags.push('Fork项目');
    if (details?.hasWiki) tags.push('有Wiki');
    if (details?.hasPages) tags.push('GitHub Pages');
    if (details?.hasDiscussions) tags.push('社区讨论');
    
    if (details?.pushedAt) {
      const lastPush = new Date(details.pushedAt);
      const daysSince = Math.floor((Date.now() - lastPush) / (1000 * 60 * 60 * 24));
      if (daysSince < 7) tags.push('最近更新');
      else if (daysSince < 30) tags.push('本月活跃');
    }
    
    tags.push('程序员必备', '效率工具', '技术分享');
    
    return [...new Set(tags)].slice(0, 8);
  }

  generateArticle(repo, details = null) {
    const overview = {
      name: repo.name,
      fullName: repo.fullName || repo.full_name,
      description: repo.description || details?.description || '',
      stars: this.formatNumber(repo.stars || details?.stars || 0),
      forks: this.formatNumber(repo.forks || details?.forks || 0),
      watchers: this.formatNumber(details?.watchers || 0),
      language: repo.language || details?.language || '多语言',
      url: repo.htmlUrl || repo.html_url || '',
      topics: details?.topics || repo.topics || [],
      license: details?.license || null,
      createdAt: details?.createdAt || repo.createdAt,
      updatedAt: details?.updatedAt || repo.updatedAt,
      pushedAt: details?.pushedAt,
      topContributors: details?.topContributors || [],
      latestRelease: details?.latestRelease,
      readmePreview: details?.readmePreview || '',
    };

    return {
      title: this.generateTitle(repo, details),
      hook: this.generateHook(repo, details),
      emotion: this.generateEmotionSection(repo, details),
      overview,
      highlights: this.generateHighlights(repo, details),
      cases: this.generateCases(repo, details),
      quickStart: this.generateQuickStart(repo, details),
      testimonials: this.generateTestimonials(repo, details),
      tags: this.generateTags(repo, details),
      cta: {
        text: `👆 点击阅读原文，给 ${repo.name} 点个 Star 支持一下！`,
        bonus: '关注本公众号，回复「项目名」获取完整使用教程和最佳实践',
        actions: [
          '🔥 太棒了，马上试试！',
          '💡 有点意思，先收藏',
          '🤔 一般般，观望中',
        ],
      },
    };
  }

  exportToMarkdown(article) {
    return `# ${article.title}

## 🎯 开头
${article.hook}

${article.emotion}

---

## 📊 项目速览

**项目名称**：${article.overview.name}

**项目描述**：${article.overview.description}

**GitHub 数据**：
- ⭐ Star 数：${article.overview.stars}
- 🍴 Fork 数：${article.overview.forks}
- 👀 Watchers：${article.overview.watchers}
- 💻 主要语言：${article.overview.language}
- 🔗 项目地址：${article.overview.url}
${article.overview.license ? `- 📄 开源协议：${article.overview.license}` : ''}

**相关标签**：${(article.tags || []).join('、')}

---

## 💡 核心亮点

${article.highlights.map((h, i) => `${i + 1}. **${h.emoji} ${h.title}**：${h.desc}`).join('\n\n')}

---

## 🚀 实战案例

${article.cases.map((c, i) => `### ${c.title}
${c.emoji} **以前**：${c.before}

😊 **现在**：${c.after}

🎉 **效果**：${c.improvement}`).join('\n\n')}

---

## 🛠️ 快速上手

### 安装
\`\`\`bash
${article.quickStart.install}
\`\`\`

### 使用示例
\`\`\`${article.overview.language?.toLowerCase() || 'javascript'}
${article.quickStart.usage}
\`\`\`

---

## 💬 用户评价

${article.testimonials.map(t => `> "${t.content}" —— ${t.role}${t.verified ? ' ✅' : ''}`).join('\n\n')}

---

## 🎁 福利时间

${article.cta.bonus}

---

**${article.cta.text}**

---

${article.tags.map(t => `#${t}`).join(' ')}
`;
  }

  exportToWechat(article) {
    return `<h1 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin-bottom: 20px; line-height: 1.4;">${article.title}</h1>

<blockquote style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: 20px 0; border-radius: 12px; font-style: italic; line-height: 1.8;">
${article.hook.replace(/\n/g, '<br>')}
</blockquote>

<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; color: #666; line-height: 1.6;">
${article.emotion.replace(/\n/g, '<br>')}
</div>

<h2 style="color: #2c3e50; font-size: 20px; margin-top: 30px; border-left: 4px solid #667eea; padding-left: 15px;">📊 项目速览</h2>

<p><strong>项目名称</strong>：${article.overview.name}</p>
<p><strong>项目描述</strong>：${article.overview.description}</p>

<div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 20px; border-radius: 12px; margin: 15px 0;">
<p style="margin: 8px 0;">⭐ <strong>Star 数</strong>：${article.overview.stars}</p>
<p style="margin: 8px 0;">🍴 <strong>Fork 数</strong>：${article.overview.forks}</p>
<p style="margin: 8px 0;">👀 <strong>Watchers</strong>：${article.overview.watchers}</p>
<p style="margin: 8px 0;">💻 <strong>主要语言</strong>：${article.overview.language}</p>
<p style="margin: 8px 0;">🔗 <strong>项目地址</strong>：<a href="${article.overview.url}" style="color: #667eea;">${article.overview.url}</a></p>
${article.overview.license ? `<p style="margin: 8px 0;">📄 <strong>开源协议</strong>：${article.overview.license}</p>` : ''}
</div>

<h2 style="color: #2c3e50; font-size: 20px; margin-top: 30px; border-left: 4px solid #667eea; padding-left: 15px;">💡 核心亮点</h2>

${article.highlights.map((h, i) => `
<div style="margin: 15px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
<h3 style="margin: 0 0 10px 0; font-size: 18px;">${h.emoji} ${h.title}</h3>
<p style="margin: 0; opacity: 0.95; line-height: 1.6;">${h.desc}</p>
</div>
`).join('')}

<h2 style="color: #2c3e50; font-size: 20px; margin-top: 30px; border-left: 4px solid #667eea; padding-left: 15px;">🚀 实战案例</h2>

${article.cases.map((c, i) => `
<div style="border: 2px solid #e8ecf1; border-radius: 12px; padding: 20px; margin: 15px 0; background: white;">
<h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px;">${c.title}</h3>
<p style="margin: 10px 0; color: #e74c3c;">${c.emoji} <strong>以前</strong>：${c.before}</p>
<p style="margin: 10px 0; color: #27ae60;">😊 <strong>现在</strong>：${c.after}</p>
<p style="margin: 10px 0 0 0; color: #f39c12; font-weight: bold;">🎉 ${c.improvement}</p>
</div>
`).join('')}

<h2 style="color: #2c3e50; font-size: 20px; margin-top: 30px; border-left: 4px solid #667eea; padding-left: 15px;">🛠️ 快速上手</h2>

<div style="background: #1e1e1e; color: #d4d4d4; padding: 20px; border-radius: 12px; overflow-x: auto; margin: 15px 0;">
<pre style="margin: 0; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6;">${article.quickStart.install}</pre>
</div>

<h2 style="color: #2c3e50; font-size: 20px; margin-top: 30px; border-left: 4px solid #667eea; padding-left: 15px;">💬 用户评价</h2>

${article.testimonials.map(t => `
<blockquote style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-left: 4px solid #ff6b6b; padding: 20px; margin: 15px 0; border-radius: 0 12px 12px 0;">
<p style="margin: 0; font-style: italic; color: #5d4e37; line-height: 1.6;">"${t.content}"</p>
<p style="margin: 10px 0 0 0; text-align: right; color: #8b7355; font-size: 14px;">—— ${t.role} ${t.verified ? '✅' : ''}</p>
</blockquote>
`).join('')}

<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 16px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(245, 87, 108, 0.3);">
<h3 style="margin: 0 0 15px 0; font-size: 22px;">🎁 福利时间</h3>
<p style="margin: 0; font-size: 16px; line-height: 1.6;">${article.cta.bonus}</p>
</div>

<p style="text-align: center; font-size: 18px; color: #666; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
${article.cta.text}
</p>

<div style="text-align: center; margin-top: 30px; padding: 20px; background: #f0f4f8; border-radius: 12px;">
<p style="margin: 0 0 15px 0; color: #666; font-size: 16px;">你觉得这个项目怎么样？</p>
<p style="margin: 0;">
${article.cta.actions.map(a => `<span style="display: inline-block; margin: 5px 10px; padding: 8px 16px; background: white; border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">${a}</span>`).join('')}
</p>
</div>

<p style="text-align: center; margin-top: 30px;">
${article.tags.map(t => `<span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; margin: 5px; font-size: 14px;">#${t}</span>`).join('')}
</p>`;
  }
}

const articleGenerator = new ArticleGenerator();

export default articleGenerator;
export { ArticleGenerator };
