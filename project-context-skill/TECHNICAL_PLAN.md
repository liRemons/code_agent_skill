# 项目上下文管理 Skill 技术方案

## 一、概述

### 1.1 目标
创建一个通用的项目上下文管理 Skill,用于在编写代码时节约 token、避免重复读取文件、设置项目边界和规范,提升编码效率。

### 1.2 适用范围
- 通用模板设计,可复用于任何项目
- 适配 FittenCode 平台的 Skill 机制
- 支持自然语言触发和自动激活

---

## 二、核心架构

### 2.1 目录结构
```
project-context-skill/
├── SKILL.md                      # Skill 主指令文件(核心)
├── scripts/
│   ├── update-context.js         # 项目信息更新脚本
├── templates/
│   ├── context-template.md       # 上下文模板
│   └── rules-template.md         # 规范模板
└── README.md                     # 使用说明
```

### 2.2 数据流
```
项目代码 → update-context.js → context-store.json → SKILL.md 指令 → LLM 决策
                              ↓
                        目录树/模块功能/文件摘要/规范
```

---

## 三、SKILL.md 设计方案

### 3.1 触发条件

#### 自动触发关键词
```yaml
triggers:
  - "项目结构"
  - "目录树"
  - "模块分析"
  - "文件位置"
  - "代码规范"
  - "编码规则"
  - "查看项目"
  - "项目上下文"
```

#### 手动触发
用户通过 `use_skill project-context` 显式调用。

### 3.1.1 Skill 元数据规范

FittenCode 平台的 Skill 文件必须在 SKILL.md 开头包含 YAML front matter 元数据，否则导入时会报错：`Invalid skill file: name or description is required`。

```yaml
---
name: project-context
description: 项目上下文管理专家，负责在编码任务中高效获取和使用项目信息，节约token、避免重复读取文件、设置项目边界和规范。
---
```

#### 必填字段
| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | Skill 唯一标识符，用于触发和引用 | `project-context` |
| `description` | Skill 功能描述，显示在技能列表中 | `项目上下文管理专家...` |

#### 注意事项
- YAML front matter 必须使用 `---` 作为开始和结束分隔符
- `name` 字段使用小写英文字母和连字符，不能包含空格
- `description` 建议使用中文，简洁描述 Skill 的核心功能
- front matter 必须位于文件最顶部，不能有任何前置空白或注释

### 3.2 核心指令内容

```markdown
# Project Context Skill

## 角色
你是项目上下文管理专家,负责在编码任务中高效获取和使用项目信息。

## 工作规则

### 1. 文件读取策略
- 文件 >500 行 → 使用 readAbstraction=true
- 已读文件再次访问 → 从 context-store 获取缓存
- 仅需特定行 → 使用 lineNumber 参数精确定位
- 避免重复读取 → 同一会话中同一文件最多读 2 次

### 2. Token 节约
- 省略已知上下文信息
- 响应聚焦于变更点
- 使用简洁的描述而非完整代码
- 工具调用前评估必要性

### 3. 规范应用
- 编码风格: 遵循项目配置的 Prettier/ESLint
- Git 提交: conventional commits 格式
- 错误处理: 必须包含 try-catch 或错误码检查
- 代码生成时必须要兜底空指针等异常错误
- 文档: 公共函数需要 JSDoc/TSDoc 注释

### 4. 容错机制
- context-store.json 不存在 → 提示运行更新脚本
- 数据损坏 → 忽略缓存,使用实时扫描
- 路径不存在 → 记录警告并跳过
- 工具调用失败 → 尝试替代方案
```

### 3.3 指令加载时机
- 检测到项目探索类任务
- 用户明确要求加载上下文
- 开始多文件操作前

---

## 四、update-context.js 脚本设计

### 4.1 功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 目录树扫描 | 递归生成项目目录结构 | P0 |
| 文件分析 | 识别关键配置文件、入口文件 | P0 |
| 模块摘要 | 为每个模块生成简短描述 | P0 |
| 依赖检测 | 分析 package.json 等依赖文件 | P0 |
| 规范提取 | 自动读取 ESLint/Prettier 配置 | P0 |
| 代码分析 | 提取 import/export/函数定义 | P0 |
| 依赖关系图 | 构建模块间引用关系 | P1 |

### 4.2 输出文档结构

脚本生成 `.context/` 目录，包含以下文档：

```
.context/
├── index.md           # 项目概览索引
├── config.md          # 配置信息（依赖、构建工具、技术栈、脚本命令）
├── modules.md         # 模块分析（目录结构、模块详情、导出内容、文件列表）
├── code-style.md      # 代码风格（语言分布、命名约定、代码组织）
└── dependencies.json  # 模块间依赖关系图
```

#### index.md - 项目概览索引

```markdown
# 项目上下文索引

> 生成时间: {timestamp}
> 项目路径: {projectRoot}

## 文档列表

| 文件 | 说明 |
|------|------|
| [config.md](./config.md) | 配置信息（依赖、构建工具、技术栈） |
| [modules.md](./modules.md) | 模块分析（目录结构、模块详情、导出内容） |
| [code-style.md](./code-style.md) | 代码风格（语言分布、命名约定、代码组织） |
| [dependencies.json](./dependencies.json) | 依赖关系图（模块间引用） |

## 项目概览

- **框架**: {frameworks}
- **构建工具**: {buildTools}
- **代码文件**: {codeFilesCount} 个
- **目录数**: {directoryCount} 个
- **模块数**: {moduleCount} 个有依赖关系
```

#### config.md - 配置信息

包含以下内容：
- 包管理器（npm/yarn/pnpm）
- TypeScript 配置（strict、target、module）
- 技术栈（框架、构建工具、代码检查、测试框架）
- 构建脚本命令表
- 生产依赖列表
- 开发依赖列表
- 配置文件说明

#### modules.md - 模块分析

包含以下内容：
- 目录结构（树形展示）
- 每个模块的文件数、总行数、文件类型分布
- 主要导出内容列表
- 文件列表（文件、行数、导出）
- 公共组件、Hooks、工具函数表
- 复杂子应用详细分析

#### code-style.md - 代码风格

包含以下内容：
- 语言分布统计
- 格式化规则（Prettier）
- 代码规范（ESLint）及关闭/警告规则说明
- 命名约定（组件、工具、Hook 等）
- 目录结构模式
- 代码组织方式
- 状态管理、HTTP 请求、路径别名、错误处理、SEO、Git 提交规范

#### dependencies.json - 模块间依赖关系图

```json
{
  "project": "项目名称",
  "description": "模块间依赖关系图",
  "sharedModules": {
    "components": { "path": "...", "items": [...] },
    "axios": { "path": "...", "exports": [...] },
    "utils": { "path": "...", "items": [...] },
    "hooks": { "path": "...", "items": [...] }
  },
  "apps": [
    {
      "name": "appName",
      "description": "应用描述",
      "hasModel": true,
      "modelFiles": ["..."],
      "dependsOn": ["components", "utils"]
    }
  ]
}
```

### 4.3 实现伪代码

```javascript
// 主流程
async function updateContext(projectRoot) {
  const contextDir = path.join(projectRoot, '.context');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  // 1. 检测配置
  const config = detectConfigurations(projectRoot);

  // 2. 扫描所有代码文件
  const allFiles = scanAllFiles(projectRoot);

  // 3. 分析目录结构
  const dirStructure = analyzeDirectoryStructure(projectRoot);

  // 4. 构建依赖图
  const depGraph = buildDependencyGraph(allFiles);

  // 5. 生成文档
  const indexMd = generateIndexMd(projectRoot, config, allFiles, dirStructure, depGraph);
  const configMd = generateConfigMd(config, projectRoot);
  const modulesMd = generateModulesMd(allFiles, dirStructure);
  const codeStyleMd = generateCodeStyleMd(allFiles, config);
  const depJson = JSON.stringify(depGraph, null, 2);

  fs.writeFileSync(path.join(contextDir, 'index.md'), indexMd, 'utf-8');
  fs.writeFileSync(path.join(contextDir, 'config.md'), configMd, 'utf-8');
  fs.writeFileSync(path.join(contextDir, 'modules.md'), modulesMd, 'utf-8');
  fs.writeFileSync(path.join(contextDir, 'code-style.md'), codeStyleMd, 'utf-8');
  fs.writeFileSync(path.join(contextDir, 'dependencies.json'), depJson, 'utf-8');

  return { success: true, contextDir };
}

// 代码文件扫描（提取 import/export/函数）
function scanAllFiles(root, currentPath = '', results = []) {
  // 遍历目录，过滤 IGNORE_DIRS
  // 对代码文件读取内容并提取：
  //   - imports: import/require 语句
  //   - exports: export 声明
  //   - functions: 函数定义
  return results;
}

// 配置检测
function detectConfigurations(root) {
  // 检测包管理器、TypeScript、Linter、测试框架
  // 检测框架（React/Vue/Angular/Next.js 等）
  // 检测构建工具（Webpack/Vite/Rollup 等）
  // 读取 package.json 分析依赖
}

// 目录结构分析
function analyzeDirectoryStructure(root) {
  // 递归扫描目录，记录路径、深度、文件数、代码文件数
}

// 依赖图构建
function buildDependencyGraph(allFiles) {
  // 根据 import/require 语句构建模块间引用关系
}
```

### 4.4 运行方式

```bash
# 在项目根目录执行
node project-context-skill/scripts/update-context.js

# 指定项目路径
node project-context-skill/scripts/update-context.js /path/to/project

# 输出结果到 .context/ 目录
```

**注意**: 仅提供 Node.js 脚本，无需 PowerShell 脚本。

---

## 五、扩展功能设计

### 5.1 Prompt 生成功能

#### 功能描述
支持根据项目上下文自动生成优化后的 prompt，包含项目结构、编码规范、关键模块信息，输出格式化的 prompt 模板供 LLM 使用。

#### 实现方式

```javascript
function generatePrompt(contextStore, options = {}) {
  const {
    includeStructure = true,
    includeRules = true,
    includeModules = true,
    targetLanguage = 'zh'
  } = options;

  let prompt = `# 项目上下文\n\n`;

  if (includeStructure) {
    prompt += generateStructureSection(contextStore.structure);
  }

  if (includeModules) {
    prompt += generateModuleSection(contextStore.modules);
  }

  if (includeRules) {
    const rules = loadProjectRules();
    prompt += generateRulesSection(rules);
  }

  prompt += generateConfigSection(contextStore.configurations);
  return prompt;
}

function generateStructureSection(structure) {
  let section = `## 项目结构\n\n\`\`\`tree\n`;
  structure.directories.forEach(dir => {
    section += `${dir.path} (${dir.fileCount} files)\n`;
  });
  section += '\n\`\`\`\n\n';
  return section;
}

function generateRulesSection(rules) {
  let section = `## 编码规范\n\n`;
  rules.codingStandards?.forEach(rule => {
    section += `- ${rule}\n`;
  });
  return section;
}
```

#### 使用示例

```bash
# 生成完整 prompt
node update-context.js --generate-prompt --output prompt.md

# 指定包含模块信息
node update-context.js --generate-prompt --include-modules

# 指定目标语言
node update-context.js --generate-prompt --lang en
```

### 5.2 对话压缩机制

#### 功能描述
- 支持长对话历史的智能压缩
- 保留关键决策点和代码变更
- 自动识别并移除冗余上下文
- 压缩策略：摘要化 + 关键点提取

#### 实现方式

```javascript
class ConversationCompressor {
  compress(messages, threshold = 50) {
    if (messages.length <= threshold) return messages;

    const keyPoints = this.extractKeyPoints(messages);
    const summaries = this.generateSummaries(messages);
    const recentMessages = messages.slice(-10); // 保留最近10条

    return [
      ...summaries.map(s => this.toSummaryMessage(s)),
      ...recentMessages
    ];
  }

  extractKeyPoints(messages) {
    return messages.filter(msg =>
      this.isDecisionPoint(msg) ||
      this.isCodeChange(msg) ||
      this.isErrorReport(msg)
    );
  }

  isDecisionPoint(message) {
    const decisionKeywords = ['决定', '选择', '采用', '方案', '确认'];
    return decisionKeywords.some(kw => message.content.includes(kw));
  }

  isCodeChange(message) {
    return message.content.includes('edit_file') ||
           message.content.includes('```') && message.content.includes('diff');
  }

  generateSummaries(messages) {
    // 将压缩的消息分组并生成摘要
    const groups = this.groupMessages(messages);
    return groups.map(group => ({
      period: `${group.startTime} - ${group.endTime}`,
      summary: this.summarizeGroup(group),
      keyFiles: [...new Set(group.fileChanges)]
    }));
  }
}
```

#### 压缩策略规则

```yaml
压缩触发条件:
  - 对话消息数超过 50 条
  - 上下文 token 数超过 80% 窗口限制
  - 用户手动触发压缩

保留规则:
  - 最近 10 条完整消息
  - 所有代码变更操作记录
  - 用户明确要求保留的信息
  - 关键决策点

压缩方式:
  - 按时间窗口分组摘要
  - 提取文件变更清单
  - 保留错误信息和解决方案
  - 丢弃重复的问答
```

### 5.3 用户手动配置 Rules 和 Memory

#### 功能描述
- 提供 `.project-rules.json` 配置文件，允许用户自定义编码规则
- 提供 `.project-memory.json` 配置文件，存储用户偏好和历史经验
- 配置优先级：用户配置 > 自动检测 > 默认值
- 支持热加载配置变更

#### 配置文件结构

```json
// .project-rules.json
{
  "codingStandards": {
    "language": "typescript",
    "strictMode": true,
    "namingConvention": "camelCase",
    "maxFileLength": 300,
    "maxFunctionLength": 50,
    "requireTypes": true,
    "forbidAny": true
  },
  "gitWorkflow": {
    "commitFormat": "conventional",
    "branchNaming": "feature/description",
    "requireTests": true,
    "requireCodeReview": true
  },
  "security": {
    "noHardcodedSecrets": true,
    "validateUserInput": true,
    "sanitizeOutput": true,
    "useParameterizedQueries": true
  },
  "customRules": [
    "所有 API 调用必须包含超时设置",
    "数据库查询必须使用参数化",
    "敏感操作必须记录审计日志"
  ]
}
```

```json
// .project-memory.json
{
  "userPreferences": {
    "preferredLanguage": "zh",
    "responseStyle": "concise",
    "codeCommentLanguage": "zh",
    "documentationFormat": "jsdoc"
  },
  "projectKnowledge": {
    "architectureNotes": "微服务架构，使用 gRPC 通信",
    "databaseSchema": "PostgreSQL，已建立连接池",
    "apiEndpoints": "/api/v1/ 为当前版本",
    "knownIssues": [
      "登录模块在高并发下偶发超时",
      "文件上传大于100M需要分片"
    ]
  },
  "historicalDecisions": [
    {
      "date": "2026-07-01",
      "decision": "使用 Redis 替代内存缓存",
      "reason": "多实例部署需要共享缓存",
      "files": ["src/cache/redis.ts"]
    }
  ]
}
```

#### 配置加载逻辑

```javascript
class ConfigManager {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.config = this.loadConfig();
  }

  loadConfig() {
    // 优先级: 用户配置 > 自动检测 > 默认值
    const defaults = this.getDefaultConfig();
    const autoDetected = this.autoDetectConfig();
    const userConfig = this.loadUserConfig();

    return {
      ...defaults,
      ...autoDetected,
      ...userConfig
    };
  }

  loadUserConfig() {
    const rulesPath = path.join(this.projectRoot, '.project-rules.json');
    const memoryPath = path.join(this.projectRoot, '.project-memory.json');

    return {
      rules: this.loadJsonFile(rulesPath) || {},
      memory: this.loadJsonFile(memoryPath) || {}
    };
  }

  // 热加载支持
  watchConfigChanges() {
    const rulesPath = path.join(this.projectRoot, '.project-rules.json');
    fs.watch(rulesPath, (eventType) => {
      if (eventType === 'change') {
        console.log('检测到配置变更,重新加载...');
        this.config = this.loadConfig();
      }
    });
  }
}
```

### 5.4 任务完成总结

#### 功能描述
- 每次任务完成后自动生成结构化总结
- 包含：修改文件列表、关键决策、影响范围、测试建议
- 总结格式采用 Markdown，便于存档和回顾

#### 总结模板

```javascript
function generateTaskSummary(task) {
  return `## 任务完成总结

### 任务信息
- **任务名称**: ${task.name}
- **完成时间**: ${new Date().toISOString()}
- **执行时长**: ${task.duration}

### 修改文件清单
${task.changedFiles.map(f => `- \`${f.path}\` (${f.changeType})`).join('\n')}

### 新增文件
${task.newFiles.map(f => `- \`${f.path}\``).join('\n') || '无'}

### 删除文件
${task.deletedFiles.map(f => `- \`${f.path}\``).join('\n') || '无'}

### 关键决策
${task.decisions.map(d => `- ${d}`).join('\n') || '无'}

### 影响范围
- **影响模块**: ${task.affectedModules.join(', ')}
- **影响接口**: ${task.affectedApis.join(', ') || '无'}
- **数据库变更**: ${task.hasDatabaseChanges ? '是' : '否'}

### 测试建议
${task.testSuggestions.map(s => `- ${s}`).join('\n')}

### 后续事项
${task.followUpItems.map(item => `- [ ] ${item}`).join('\n') || '无'}
`;
}
```

#### 触发时机
- 子代理完成任务时自动触发
- 用户手动请求总结
- 多步骤任务完成所有阶段后

### 5.5 Code Review 支持

#### 功能描述
- 集成代码审查流程
- 检查项：代码风格、潜在bug、性能问题、安全漏洞
- 生成 review 报告，标注问题和改进建议
- 支持增量审查（仅审查变更部分）

#### 审查检查清单

```javascript
const codeReviewChecklist = {
  style: [
    { id: 'naming', name: '命名规范', check: (code) => checkNamingConvention(code) },
    { id: 'formatting', name: '代码格式', check: (code) => checkFormatting(code) },
    { id: 'comments', name: '注释完整性', check: (code) => checkComments(code) }
  ],
  correctness: [
    { id: 'null_check', name: '空指针防护', check: (code) => checkNullSafety(code) },
    { id: 'error_handling', name: '错误处理', check: (code) => checkErrorHandling(code) },
    { id: 'type_safety', name: '类型安全', check: (code) => checkTypeSafety(code) },
    { id: 'boundary', name: '边界条件', check: (code) => checkBoundaryConditions(code) }
  ],
  performance: [
    { id: 'async_usage', name: '异步使用', check: (code) => checkAsyncPatterns(code) },
    { id: 'memory', name: '内存使用', check: (code) => checkMemoryUsage(code) },
    { id: 'loops', name: '循环优化', check: (code) => checkLoopOptimization(code) }
  ],
  security: [
    { id: 'input_validation', name: '输入验证', check: (code) => checkInputValidation(code) },
    { id: 'sql_injection', name: 'SQL注入防护', check: (code) => checkSqlInjection(code) },
    { id: 'xss', name: 'XSS防护', check: (code) => checkXSSProtection(code) },
    { id: 'secrets', name: '敏感信息', check: (code) => checkForSecrets(code) }
  ]
};
```

#### Review 报告格式

```markdown
## Code Review 报告

### 概述
- 审查文件: 5 个
- 发现问题: 3 个 (严重: 1, 警告: 2)

### 问题详情

#### [严重] 空指针风险
- 文件: src/services/user.ts:45
- 描述: 未检查 API 返回值可能为 null
- 建议: 添加可选链操作符或 null 检查

#### [警告] 缺少错误处理
- 文件: src/utils/parser.ts:120
- 描述: try-catch 块中未记录错误信息
- 建议: 添加错误日志记录

### 评分
- 代码风格: ★★★★☆
- 代码质量: ★★★☆☆
- 安全性: ★★★★☆
```

### 5.6 ESLint 检测集成

#### 功能描述
- 在代码生成/修改后自动运行 ESLint
- 检测配置遵循项目的 .eslintrc 配置
- 发现错误时提供修复建议或自动修复选项
- 严重错误阻止提交，警告级别提示用户

#### 实现方式

```javascript
class ESLintChecker {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.configPath = this.detectEslintConfig();
  }

  async checkFile(filePath) {
    const command = `npx eslint "${filePath}" --format json`;
    const result = await executeCommand(command, this.projectRoot);

    if (result.exitCode === 0) {
      return { status: 'passed', messages: [] };
    }

    const reports = JSON.parse(result.stdout);
    return this.parseReport(reports, filePath);
  }

  async checkAndFix(filePath) {
    const command = `npx eslint "${filePath}" --fix --format json`;
    const result = await executeCommand(command, this.projectRoot);
    return this.parseReport(JSON.parse(result.stdout), filePath);
  }

  parseReport(reports, filePath) {
    const errors = [];
    const warnings = [];

    reports.forEach(report => {
      report.messages.forEach(msg => {
        const issue = {
          line: msg.line,
          column: msg.column,
          severity: msg.severity === 2 ? 'error' : 'warning',
          rule: msg.ruleId,
          message: msg.message
        };

        if (msg.severity === 2) {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      });
    });

    return {
      status: errors.length > 0 ? 'failed' : 'passed',
      errors,
      warnings,
      summary: `发现 ${errors.length} 个错误, ${warnings.length} 个警告`
    };
  }
}
```

#### 使用流程

\`\*\*\*yaml
代码修改后ESLint检测流程:
  1. 代码编辑完成后
  2. 自动运行 ESLint 检查
  3. 如果有可自动修复的问题:
     - 询问用户是否自动修复
     - 用户确认后执行 --fix
  4. 如果有严重错误:
     - 列出所有错误
     - 提供修复建议
     - 建议修复后再继续
  5. 如果只有警告:
     - 提示警告信息
     - 允许继续执行
\`\*\*\*

### 5.7 高风险操作确认机制

#### 功能描述
- 定义高风险操作清单
- 执行前必须向用户展示影响分析
- 等待用户明确确认后才执行
- 提供回滚方案说明

#### 高风险操作定义

```javascript
const highRiskOperations = {
  fileDeletion: {
    pattern: ['delete_file'],
    riskLevel: 'high',
    description: '删除文件是不可逆操作',
    rollback: '从 Git 恢复或从备份恢复'
  },
  configModification: {
    pattern: ['.eslintrc*', 'tsconfig.json', 'package.json', 'webpack.config*', 'vite.config*'],
    riskLevel: 'high',
    description: '修改配置文件可能影响整个项目构建',
    rollback: '从 Git 恢复配置'
  },
  databaseMigration: {
    pattern: ['migration', 'migrate', 'schema'],
    riskLevel: 'critical',
    description: '数据库迁移可能影响数据完整性',
    rollback: '执行反向迁移脚本'
  },
  apiChanges: {
    pattern: ['routes', 'controllers', 'api'],
    riskLevel: 'medium',
    description: 'API 变更可能影响客户端',
    rollback: '保持 API 版本兼容'
  },
  permissionChanges: {
    pattern: ['chmod', 'chown', 'permission', 'auth'],
    riskLevel: 'critical',
    description: '权限变更可能导致安全问题',
    rollback: '恢复原权限设置'
  }
};
```

#### 确认流程

\`\`\`markdown
## 高风险操作确认模板

⚠️ **检测到高风险操作**

**操作类型**: 删除文件
**目标文件**: \`src/core/authentication.ts\`

**影响分析**:
- 该文件被 5 个模块引用
- 删除后可能影响: 用户登录、Token 验证、权限检查
- 建议: 确认是否有替代实现

**回滚方案**:
\`\`bash
git checkout -- src/core/authentication.ts
\`\`

请确认是否继续执行？(输入 "yes" 确认)
\`\`\`

#### 实现伪代码

```javascript
async function executeWithConfirmation(operation, context) {
  const riskInfo = assessRisk(operation, context);

  if (riskInfo.level === 'critical' || riskInfo.level === 'high') {
    const confirmation = await requestUserConfirmation({
      operation: operation.type,
      target: operation.target,
      impact: riskInfo.impact,
      rollback: riskInfo.rollback
    });

    if (!confirmation.approved) {
      throw new Error('操作用户取消');
    }
  }

  // 执行操作并记录日志
  const result = await operation.execute();
  await logOperation({
    type: operation.type,
    target: operation.target,
    result: result.status,
    timestamp: new Date().toISOString()
  });

  return result;
}
```

### 5.8 禁止主动提交代码

#### 功能描述
- Skill 不得主动执行 git commit
- 仅在用户明确要求时才提供 commit 建议
- 提供 conventional commits 格式的 commit message 模板
- 提交前必须经过 code review 和 eslint 检测

#### 实现规则

\`\`\`markdown
## Git 提交规则

### 禁止行为
- ❌ 不得在任务完成后自动执行 git add/commit
- ❌ 不得在代码修改后自动提交
- ❌ 不得绕过用户直接推送代码

### 允许行为
- ✅ 用户明确要求时提供 commit message 建议
- ✅ 帮助用户格式化 commit message
- ✅ 在用户提交前提供检查清单

### Commit Message 模板

\`\`\`
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
\`\`\`

类型说明:
- feat: 新功能
- fix: 修复bug
- docs: 文档变更
- style: 代码格式(不影响代码运行)
- refactor: 重构
- test: 测试相关
- chore: 构建/工具链变更

### 提交前检查清单
- [ ] Code Review 通过
- [ ] ESLint 检测无错误
- [ ] 测试用例通过
- [ ] 影响范围已评估
\`\`\`

#### 提交建议流程

```javascript
function suggestCommitMessage(changes) {
  const type = detectChangeType(changes);
  const scope = detectAffectedScope(changes);
  const description = generateDescription(changes);

  return {
    message: `\`${type}(${scope}): ${description}\``,
    fullTemplate: `
\`${type}(${scope}): ${description}\`

${changes.summary}

Changed files:
${changes.files.map(f => \`- \${f.path}\`).join('\n')}
    `.trim()
  };
}
```

### 5.9 任务超时和中断处理

#### 功能描述
- 当任务中断或者长时间（5分钟）未响应时，及时断开连接
- 自动生成任务进度状态和结果报告
- 保存当前工作状态，支持后续恢复

#### 实现机制

```javascript
class TaskTimeoutManager {
  constructor(options = {}) {
    this.timeout = options.timeout || 300000; // 默认5分钟
    this.checkInterval = options.checkInterval || 30000; // 每30秒检查一次
    this.lastActivityTime = Date.now();
    this.taskState = null;
  }

  startMonitoring(task) {
    this.taskState = {
      id: task.id,
      name: task.name,
      startTime: Date.now(),
      progress: 0,
      completedSteps: [],
      pendingSteps: task.steps,
      currentStep: null
    };

    // 启动心跳检测
    this.heartbeatTimer = setInterval(() => {
      this.checkTimeout();
    }, this.checkInterval);

    // 更新活动时间戳
    this.updateLastActivity();
  }

  checkTimeout() {
    const inactiveDuration = Date.now() - this.lastActivityTime;
    
    if (inactiveDuration >= this.timeout) {
      console.warn(`任务 ${this.taskState.id} 已超时 (${Math.round(inactiveDuration/1000)}秒)`);
      this.handleTimeout();
    }
  }

  handleTimeout() {
    // 停止监控
    clearInterval(this.heartbeatTimer);

    // 生成进度报告
    const report = this.generateProgressReport();

    // 保存状态以便恢复
    this.saveTaskState(report);

    // 通知用户
    notifyUser({
      type: 'timeout',
      taskId: this.taskState.id,
      message: `任务已因超时而暂停`,
      progressReport: report,
      recoveryInfo: {
        canResume: true,
        stateFile: `.task-state-${this.taskState.id}.json`
      }
    });
  }

  generateProgressReport() {
    return {
      taskId: this.taskState.id,
      taskName: this.taskState.name,
      status: 'paused_due_to_timeout',
      duration: Date.now() - this.taskState.startTime,
      progress: this.calculateProgress(),
      completedSteps: this.taskState.completedSteps,
      currentStep: this.taskState.currentStep,
      pendingSteps: this.taskState.pendingSteps,
      lastActivity: new Date(this.lastActivityTime).toISOString(),
      filesModified: this.getModifiedFiles(),
      recommendations: [
        '检查网络连接是否正常',
        '确认开发环境配置',
        '查看是否有阻塞操作'
      ]
    };
  }

  updateLastActivity() {
    this.lastActivityTime = Date.now();
  }

  saveTaskState(report) {
    const stateFile = path.join(process.cwd(), `.task-state-${this.taskState.id}.json`);
    fs.writeFileSync(stateFile, JSON.stringify(report, null, 2));
  }

  calculateProgress() {
    const total = this.taskState.completedSteps.length + this.taskState.pendingSteps.length;
    return Math.round((this.taskState.completedSteps.length / total) * 100);
  }

  getModifiedFiles() {
    // 从任务执行记录中提取已修改的文件列表
    return this.taskState.fileChanges || [];
  }
}
```

#### 超时报告格式

```markdown
## 任务暂停报告

### 基本信息
- **任务ID**: 10065
- **任务名称**: 更新技术方案文档整合用户新要求
- **暂停原因**: 超过5分钟无响应
- **暂停时间**: 2026-07-24T16:30:00Z
- **运行时长**: 15分30秒

### 进度状态
- **完成度**: 60%
- **已完成步骤**:
  - ✅ 读取完整文档内容
  - ✅ 删除 PowerShell 脚本引用
  - ✅ 添加扩展功能设计章节框架
- **当前步骤**: 更新 Token 优化策略章节编号
- **待完成步骤**:
  - ⏸️ 更新技术选型表格
  - ⏸️ 更新实施计划
  - ⏸️ 添加附录配置文件示例

### 文件变更
- 已修改: PROJECT_CONTEXT_SKILL_TECHNICAL_PLAN.md
- 新增: 无
- 删除: 无

### 恢复建议
1. 检查网络连接是否正常
2. 确认开发环境配置无误
3. 查看是否有阻塞的操作或资源竞争
4. 如需继续，可加载保存的状态文件: `.task-state-10065.json`

### 下一步操作
- 输入 "resume" 继续执行任务
- 输入 "cancel" 取消任务
- 输入 "status" 查看详细状态
```

#### 触发条件

```yaml
超时触发条件:
  - 连续5分钟无任何工具调用或用户交互
  - 检测到网络中断
  - 系统资源不足导致任务挂起
  
状态保存时机:
  - 每次完成一个步骤后自动保存
  - 超时触发时立即保存
  - 用户手动请求保存
  
恢复机制:
  - 从状态文件读取上次进度
  - 跳过已完成的步骤
  - 从断点处继续执行
```

#### 使用示例

```bash
# 查看任务状态
node update-context.js --task-status 10065

# 恢复任务
node update-context.js --resume-task 10065

# 清理过期状态文件
node update-context.js --cleanup-states --older-than 7d
```

#### 与其他功能的集成

- **任务完成总结**: 超时暂停时也生成总结报告，标记状态为"已暂停"
- **对话压缩**: 保存关键上下文，压缩历史对话减少token消耗
- **状态文件格式**: JSON格式便于解析和恢复，包含完整的任务进度信息

---

## 六、Token 优化策略

### 6.1 文件读取优化

| 场景 | 传统方式 | 优化方式 | 节省估算 |
|------|----------|----------|----------|
| 大文件浏览 | 全量读取 | readAbstraction=true | 70% |
| 重复访问 | 重新读取 | 使用缓存摘要 | 90% |
| 定位修改 | 全量读取 | lineNumber 精准定位 | 60% |
| 目录探索 | 逐层 list | 使用 context-store | 80% |

### 6.2 响应输出优化

```yaml
响应规则:
  - 省略: 已知的导入语句、类型定义
  - 精简: 公共方法签名只需方法名+参数
  - 聚焦: 只输出变更代码,上下文用注释说明
  - 合并: 多处小修改合并为单次 edit_file
```

### 6.3 工具调用优化

```yaml
调用策略:
  read_file:
    max_calls_per_file: 2
    prefer_abstraction: true
    use_line_number: true  # 当知道目标行时
    
  search_files:
    scope: "先缩小搜索范围,避免全局搜索"
    
  list_files:
    use_context_store: true  # 优先使用缓存
    
  edit_file:
    batch_changes: true      # 批量合并修改
```

---

## 七、容错机制

### 7.1 脚本容错

```javascript
// 层级1: 脚本执行失败
try {
  await updateContext(projectRoot);
} catch (error) {
  if (error.code === 'ENOENT') {
    // 路径不存在,提示用户
    console.warn('项目路径不存在,请检查路径');
  } else if (error.code === 'EACCES') {
    // 权限不足,降级为只读
    console.warn('权限不足,将跳过需要写入的操作');
    return await scanReadOnly(projectRoot);
  } else {
    // 其他错误,使用缓存
    console.warn('更新失败,将使用现有缓存:', error.message);
    return loadCache(projectRoot);
  }
}

// 层级2: 数据完整性检查
function validateContextData(data) {
  const required = ['meta', 'structure'];
  const valid = required.every(key => key in data);
  return {
    valid,
    timestamp: data.meta?.generatedAt,
    isExpired: checkExpiry(data.meta?.cacheExpiry)
  };
}

// 层级3: 缓存恢复
function recoverFromCorruptedCache() {
  // 尝试修复 JSON
  // 如果失败,创建新缓存
}
```

### 7.2 Skill 指令容错

```markdown
## 容错规则

1. context-store.json 不存在
   → 提示: "请先运行 update-context.js 生成项目上下文"
   → 回退: 使用实时工具扫描

2. 缓存数据过期(>24h)
   → 提示: "项目上下文已过期,建议重新生成"
   → 继续: 仍可加载过期缓存,但标记为可能不准确

3. 关键文件变更
   → 通过 fileSignatures 检测 MD5 变化
   → 自动标记需要更新的模块

4. 工具调用失败
   → 重试一次
   → 失败则使用替代方案
   → 向用户报告降级操作
```

---

## 八、编码规范集成

### 8.1 自动检测的配置

```javascript
const configFiles = {
  'package.json':      '项目元信息、脚本命令',
  'tsconfig.json':     'TypeScript 配置',
  'jsconfig.json':     'JavaScript 配置',
  '.eslintrc*':        'ESLint 规则',
  'prettierrc':        'Prettier 配置',
  '.editorconfig':     '编辑器配置',
  'commitlint.config': '提交信息规范',
  'jest.config':       '测试配置',
  'vitest.config':     '测试配置',
  '.npmrc':            'NPM 配置',
  'Dockerfile':        'Docker 构建',
  'docker-compose.yml': 'Docker 编排'
};
```

### 8.2 规范应用规则

```markdown
## 编码规范应用

### TypeScript/JavaScript
- 优先使用 TypeScript
- 启用 strict 模式
- 避免 any 类型
- 函数需要返回类型标注

### Git 提交
- 格式: type(scope): description
- types: feat|fix|docs|style|refactor|test|chore
- 示例: feat(auth): add login validation

### 错误处理
- API 调用必须 try-catch
- 自定义错误类继承 Error
- 错误日志包含上下文信息

### 测试要求
- 新代码需要单元测试
- 覆盖率目标: 关键模块 >80%
- 测试命名: describe('模块') > it('场景')

### 代码组织
- 文件按功能模块划分
- 公共组件放 shared/common
- 工具函数放 utils/helpers
- 类型定义放 types/interfaces
```

---

## 九、使用流程

### 9.1 首次使用

```
1. 复制 project-context-skill 到项目目录
2. 运行 node scripts/update-context.js
3. 确认 context-store.json 生成成功
4. 配置 .project-rules.json 和 .project-memory.json (可选)
5. 在 FittenCode 中使用 use_skill 加载
```

### 9.2 日常使用

```
1. 项目结构变更时,运行更新脚本
2. 开始编码任务时,Skill 自动检测上下文状态
3. 按照指令执行文件读取策略
4. 代码修改后自动运行 ESLint 检测
5. 完成修改后,可选:再次运行更新脚本同步变更
6. 任务完成后查看自动生成的总结报告
```

### 9.3 多项目支持

```bash
# 为不同项目生成独立上下文
cd project-a && node update-context.js --output context-a.json
cd project-b && node update-context.js --output context-b.json
```

---

## 十、技术选型

### 10.1 语言选择

| 选项 | 优势 | 劣势 | 选择 |
|------|------|------|------|
| Node.js | 生态丰富,JSON处理方便 | 需要Node环境 | ✅ 推荐 |
| Python | 通用性强 | 可能需要pip安装 | 备选 |

**说明**: 仅提供 Node.js 脚本方案，不包含 PowerShell 脚本。

### 10.2 依赖最小化

```json
{
  "name": "project-context-generator",
  "version": "1.0.0",
  "dependencies": {},
  "optionalDependencies": {
    "ignore": "^5.2.4"  // 用于 .gitignore 解析(可选)
  }
}
```

设计原则: **零依赖**,使用 Node.js 内置模块(fs, path, crypto)。

---

## 十一、实施计划

### Phase 1: MVP (第1天)
- [ ] 创建 SKILL.md 基础指令
- [ ] 实现 update-context.js 基础扫描
- [ ] 输出 context-store.json
- [ ] 实现用户手动配置 Rules 和 Memory

### Phase 2: 核心功能 (第2-3天)
- [ ] 完善文件读取策略
- [ ] 实现缓存机制
- [ ] 添加容错处理
- [ ] 实现对话压缩机制

### Phase 3: 扩展功能 (第4-6天)
- [ ] Prompt 生成功能
- [ ] 任务完成总结
- [ ] Code Review 支持
- [ ] ESLint 检测集成
- [ ] 高风险操作确认机制
- [ ] 禁止主动提交代码规则

### Phase 4: 高级功能 (第7-8天)
- [ ] 任务超时和中断处理
- [ ] 模块依赖分析
- [ ] 规范自动检测
- [ ] 变更检测机制

### Phase 5: 测试验证
- [ ] 在不同项目类型测试(React/Vue/Node/Python)
- [ ] 性能基准测试(扫描速度)
- [ ] Token 消耗对比
- [ ] 安全机制测试(高风险操作确认)

---

## 十二、注意事项

1. **隐私保护**: context-store.json 不应包含代码内容,仅包含结构和元数据
2. **体积控制**: 生成的 context-store.json 应 <100KB
3. **兼容性**: 支持 Windows/macOS/Linux
4. **可配置**: 提供 .project-context.json 配置文件覆盖默认行为
5. **性能**: 扫描大型项目(<5000文件)应在 30 秒内完成
6. **安全**: 高风险操作必须经过用户确认
7. **合规**: 代码修改后必须通过 ESLint 检测
8. **禁止**: 不得主动执行 git commit 操作

---

## 附录A: 配置文件示例

### A.1 基础配置文件

```json
// .project-context.json
{
  "exclude": ["vendor/", "build/", "coverage/"],
  "includeHidden": false,
  "maxDepth": 5,
  "largeFileThreshold": 500,
  "cacheExpiry": 86400,
  "generateModuleDescriptions": true,
  "skipDependencyAnalysis": false
}
```

### A.2 编码规则配置文件

```json
// .project-rules.json
{
  "codingStandards": {
    "language": "typescript",
    "strictMode": true,
    "namingConvention": "camelCase",
    "maxFileLength": 300,
    "requireTypes": true,
    "forbidAny": true
  },
  "security": {
    "noHardcodedSecrets": true,
    "validateUserInput": true
  },
  "customRules": [
    "所有 API 调用必须包含超时设置",
    "数据库查询必须使用参数化"
  ]
}
```

### A.3 项目记忆配置文件

```json
// .project-memory.json
{
  "userPreferences": {
    "preferredLanguage": "zh",
    "responseStyle": "concise"
  },
  "projectKnowledge": {
    "architectureNotes": "微服务架构",
    "knownIssues": []
  },
  "historicalDecisions": []
}
```

---

## 附录B: 预期效果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 平均 Token 消耗 | 1000/token | 400/token | 60% |
| 文件读取次数 | 8次/任务 | 3次/任务 | 62% |
| 项目理解时间 | 5分钟 | 30秒 | 90% |
| 上下文一致性 | 人工维护 | 自动同步 | 自动化 |
| 代码质量 | 依赖人工审查 | ESLint + Code Review | 显著提升 |
