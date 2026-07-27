/**
 * 项目上下文分析器 - CLI 入口
 * 负责项目分析、Prompt 生成、对话压缩三大功能
 *
 * 用法:
 *   node update-context.js [项目路径]                    # 执行项目分析
 *   node update-context.js --generate-prompt [选项]      # 生成项目 Prompt
 *   node update-context.js --compress --input file.json  # 压缩对话历史
 */

const fs = require('fs');
const path = require('path');
const { scanAllFiles } = require('./lib/scanner');
const { readTextFile } = require('./lib/utils');
const { detectConfigurations, analyzeDirectoryStructure, buildDependencyGraph } = require('./lib/config');
const {
  loadProjectRules, loadProjectMemory,
  generateRulesMd, generateMemoryMd, generateConfigMd, generateModulesMd, generateCodeStyleMd
} = require('./lib/generators');
const { generatePrompt } = require('./lib/prompt');
const { compressConversation } = require('./lib/compress');

/**
 * 执行项目分析并生成 .context/ 目录
 * @param {string} projectRoot - 项目根目录
 * @returns {object} 包含 success 和 contextDir 的结果对象
 */
async function updateContext(projectRoot) {
  console.log(`正在深度扫描项目: ${projectRoot}`);

  const contextDir = path.join(projectRoot, '.context');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  // 1. 检测配置
  console.log('  检测配置信息...');
  const config = detectConfigurations(projectRoot);

  // 2. 扫描所有代码文件
  console.log('  扫描代码文件...');
  const allFiles = scanAllFiles(projectRoot);
  console.log(`  发现 ${allFiles.length} 个代码文件`);

  // 3. 分析目录结构
  console.log('  分析目录结构...');
  const dirStructure = analyzeDirectoryStructure(projectRoot);

  // 4. 构建依赖图
  console.log('  构建依赖关系图...');
  const depGraph = buildDependencyGraph(allFiles);

  // 5. 生成文档
  console.log('  生成配置文档...');
  const configMd = generateConfigMd(config, projectRoot);
  fs.writeFileSync(path.join(contextDir, 'config.md'), configMd, 'utf-8');

  console.log('  生成模块分析文档...');
  const modulesMd = generateModulesMd(allFiles, dirStructure);
  fs.writeFileSync(path.join(contextDir, 'modules.md'), modulesMd, 'utf-8');

  console.log('  生成代码风格文档...');
  const codeStyleMd = generateCodeStyleMd(allFiles, config);
  fs.writeFileSync(path.join(contextDir, 'code-style.md'), codeStyleMd, 'utf-8');

  console.log('  生成依赖关系 JSON...');
  const depJson = JSON.stringify(depGraph, null, 2);
  fs.writeFileSync(path.join(contextDir, 'dependencies.json'), depJson, 'utf-8');

  console.log('  加载用户规则配置...');
  const rules = loadProjectRules(projectRoot);
  const rulesMd = generateRulesMd(rules, config);
  fs.writeFileSync(path.join(contextDir, 'rules.md'), rulesMd, 'utf-8');

  console.log('  加载用户记忆配置...');
  const memory = loadProjectMemory(projectRoot);
  const memoryMd = generateMemoryMd(memory);
  fs.writeFileSync(path.join(contextDir, 'memory.md'), memoryMd, 'utf-8');

  // 6. 生成索引文件
  const hasRules = !!rules;
  const hasMemory = !!memory;
  const indexMd = `# 项目上下文索引

> 生成时间: ${new Date().toISOString()}
> 项目路径: ${projectRoot}

## 文档列表

| 文件 | 说明 |
|------|------|
| [config.md](./config.md) | 配置信息（依赖、构建工具、技术栈） |
| [modules.md](./modules.md) | 模块分析（目录结构、模块详情、导出内容） |
| [code-style.md](./code-style.md) | 代码风格（语言分布、命名约定、代码组织） |
| [dependencies.json](./dependencies.json) | 依赖关系图（模块间引用） |
| [rules.md](./rules.md) | 项目规则（编码标准、Git 工作流、安全规则、自定义规则） |
| [memory.md](./memory.md) | 项目记忆（用户偏好、项目知识、历史决策） |

## 项目概览

- **框架**: ${config.frameworks.join(', ') || '未检测'}
- **构建工具**: ${config.buildTools.join(', ') || '未检测'}
- **代码文件**: ${allFiles.length} 个
- **目录数**: ${dirStructure.length} 个
- **模块数**: ${Object.keys(depGraph).length} 个有依赖关系
- **自定义规则**: ${hasRules ? '已配置' : '未配置 (.project-rules.json)'}
- **项目记忆**: ${hasMemory ? '已配置' : '未配置 (.project-memory.json)'}
`;
  fs.writeFileSync(path.join(contextDir, 'index.md'), indexMd, 'utf-8');

  console.log(`\n✓ 项目分析完成! 文档已生成到: ${contextDir}`);
  console.log(`  - index.md (索引)`);
  console.log(`  - config.md (配置信息)`);
  console.log(`  - modules.md (模块分析)`);
  console.log(`  - code-style.md (代码风格)`);
  console.log(`  - dependencies.json (依赖关系)`);
  console.log(`  - rules.md (项目规则) ${hasRules ? '✓ 含用户配置' : ''}`);
  console.log(`  - memory.md (项目记忆) ${hasMemory ? '✓ 含用户配置' : ''}`);

  return { success: true, contextDir };
}

// ==================== CLI 入口 ====================

// 解析命令行参数
const args = process.argv.slice(2);
const projectRoot = args[0] && !args[0].startsWith('-') ? args[0] : process.cwd();

// Prompt 生成模式参数
const generatePromptFlag = args.includes('--generate-prompt');
const outputArg = args.indexOf('--output');
const outputFile = outputArg >= 0 && args[outputArg + 1] ? args[outputArg + 1] : null;

// 对话压缩模式参数
const compressFlag = args.includes('--compress');
const inputArg = args.indexOf('--input');
const inputFile = inputArg >= 0 && args[inputArg + 1] ? args[inputArg + 1] : null;
const thresholdArg = args.indexOf('--threshold');
const threshold = thresholdArg >= 0 && args[thresholdArg + 1] ? parseInt(args[thresholdArg + 1], 10) : 50;

// 对话压缩模式：读取对话 JSON 并执行压缩
if (compressFlag) {
  if (!inputFile) {
    console.error('错误: --compress 需要 --input 参数指定对话文件');
    console.error('  node update-context.js --compress --input conversation.json --output compressed.json');
    process.exit(1);
  }
  const content = readTextFile(path.resolve(inputFile));
  if (!content) {
    console.error(`错误: 无法读取文件 ${inputFile}`);
    process.exit(1);
  }
  let messages;
  try {
    messages = JSON.parse(content);
    if (!Array.isArray(messages)) messages = [messages];
  } catch (e) {
    console.error('错误: 输入文件格式无效，应为 JSON 数组');
    process.exit(1);
  }
  const result = compressConversation(messages, { threshold });
  const output = JSON.stringify(result, null, 2);
  if (outputFile) {
    fs.writeFileSync(path.resolve(outputFile), output, 'utf-8');
    console.log(`✓ 对话压缩完成: ${outputFile}`);
  } else {
    console.log(output);
  }
  console.log(`  原始: ${result.stats.original} 条 → 压缩后: ${result.stats.compressed} 条 (节省 ${result.stats.saved} 条)`);
  console.log(`  关键信息: ${result.stats.keyPoints} 条, 错误: ${result.stats.errors} 条`);
} else if (generatePromptFlag) {
  // Prompt 生成模式：从 .context/ 目录组装结构化 Prompt
  const contextDir = path.join(projectRoot, '.context');
  if (!fs.existsSync(contextDir)) {
    console.error('错误: .context/ 目录不存在，请先运行项目分析:');
    console.error('  node update-context.js');
    process.exit(1);
  }
  const options = {
    includeStructure: args.includes('--include-structure'),
    includeConfig: !args.includes('--no-config'),
    includeModules: args.includes('--include-modules') || !args.includes('--no-modules'),
    includeCodeStyle: !args.includes('--no-style'),
    includeDependencies: args.includes('--include-deps'),
    targetLanguage: args.includes('--lang') && args[args.indexOf('--lang') + 1] ? args[args.indexOf('--lang') + 1] : 'zh'
  };
  const prompt = generatePrompt(contextDir, options);
  if (outputFile) {
    fs.writeFileSync(path.resolve(outputFile), prompt, 'utf-8');
    console.log(`✓ Prompt 已生成: ${outputFile}`);
  } else {
    console.log(prompt);
  }
} else {
  // 默认模式：执行项目分析并生成 .context/ 目录
  updateContext(projectRoot).catch(err => {
    console.error('分析失败:', err);
    process.exit(1);
  });
}

// 导出模块供外部调用
module.exports = { updateContext, generatePrompt, compressConversation };
