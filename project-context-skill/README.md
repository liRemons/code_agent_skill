# Project Context Skill

项目上下文管理 Skill，用于在编码任务中节约 token、避免重复读取文件、设置项目边界和规范，提升编码效率。

## 功能特性

- **Token 优化**: 减少文件读取次数，使用抽象视图替代全量读取
- **智能缓存**: 自动缓存项目结构、模块信息和文件签名
- **规范应用**: 自动检测并应用项目的编码规范
- **容错机制**: 支持缓存损坏恢复、降级处理

## 安装

将 `project-context-skill` 目录复制到项目根目录。

## 使用

### 生成项目上下文

在项目根目录执行:

```bash
node project-context-skill/scripts/update-context.js
```

将在项目根目录生成 `context-store.json`。

### 命令行参数

```bash
# 生成完整 prompt
node scripts/update-context.js --generate-prompt --output prompt.md

# 指定包含模块信息
node scripts/update-context.js --generate-prompt --include-modules

# 查看任务状态
node scripts/update-context.js --task-status <taskId>

# 清理过期缓存
node scripts/update-context.js --cleanup
```

### Skill 触发

- **自动触发**: 当用户询问"项目结构"、"目录树"、"模块分析"、"代码规范"等问题时
- **手动触发**: 使用 `use_skill project-context`

## 输出数据结构

`context-store.json` 包含以下信息：

```json
{
  "meta": {
    "version": "1.0.0",
    "generatedAt": "2026-07-24T15:59:45Z",
    "projectRoot": "/absolute/path/to/project",
    "cacheExpiry": 86400
  },
  "structure": {
    "directories": [...],
    "keyFiles": [...]
  },
  "modules": [...],
  "configurations": {...},
  "fileSignatures": {...}
}
```

## 文件说明

| 文件 | 描述 |
|------|------|
| SKILL.md | Skill 主指令文件 |
| scripts/update-context.js | 项目信息更新脚本 |
| templates/context-template.md | 上下文模板 |
| templates/rules-template.md | 规范模板 |

## 自定义配置

### 编码规则

在项目根目录创建 `.project-rules.json` 自定义编码规则：

```json
{
  "codingStandards": {
    "language": "typescript",
    "strictMode": true,
    "namingConvention": "camelCase"
  },
  "gitWorkflow": {
    "commitFormat": "conventional",
    "branchNaming": "feature/description"
  }
}
```

### 项目记忆

在项目根目录创建 `.project-memory.json` 存储用户偏好：

```json
{
  "userPreferences": {
    "preferredLanguage": "zh",
    "responseStyle": "concise"
  },
  "projectKnowledge": {
    "architectureNotes": "微服务架构",
    "knownIssues": []
  }
}
```

## 技术细节

### 扫描规则

- 最大扫描深度: 4 层
- 忽略目录: `node_modules`, `.git`, `dist`, `build`, `coverage`
- 缓存过期时间: 24 小时

### 文件读取策略

- 文件 >500 行 → 使用 `readAbstraction=true`
- 已读文件再次访问 → 从 context-store 获取缓存
- 仅需特定行 → 使用 `lineNumber` 参数精确定位

## License

MIT