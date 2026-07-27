/**
 * 文档生成模块
 * 负责生成 .context/ 目录下的所有 Markdown 文档
 * 包括：项目规则、项目记忆、配置信息、模块分析、代码风格
 */

const fs = require('fs');
const { path, readJsonFile, readTextFile } = require('./utils');

// JSON 配置示例文本
const jsonExample = {
  rules: `{
  "naming": {
    "variables": "camelCase",
    "functions": "camelCase",
    "classes": "PascalCase",
    "constants": "UPPER_SNAKE_CASE",
    "files": "kebab-case"
  },
  "limits": {
    "maxFileLength": 500,
    "maxFunctionLength": 80,
    "maxLineLength": 120
  },
  "git": {
    "commitFormat": "conventional",
    "branchPrefix": "feature/"
  },
  "codeStyle": {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "es5"
  },
  "customRules": [
    "所有公共函数必须有 JSDoc 注释",
    "异步操作必须包含错误处理"
  ]
}`,
  memory: `{
  "language": {
    "response": "zh",
    "comments": "zh",
    "documentation": "zh"
  },
  "style": {
    "responseDetail": "concise",
    "codeExplanation": "brief"
  },
  "project": {
    "description": "项目简要描述",
    "architecture": "架构说明",
    "knownIssues": ["已知问题列表"]
  },
  "history": [
    {
      "date": "2026-07-27",
      "decision": "决策内容",
      "reason": "决策原因"
    }
  ]
}`
};

/**
 * 获取全局配置目录
 * @returns {string} 全局配置目录路径
 */
function getGlobalConfigDir() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (!home) return '';
  return path.join(home, '.fittencode');
}

/**
 * 深合并两个对象（对象合并，数组拼接）
 * @param {object} base - 基础对象（优先级低）
 * @param {object} override - 覆盖对象（优先级高）
 * @returns {object} 合并后的新对象
 */
function deepMerge(base, override) {
  if (!base || !override) return override || base || {};
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = result[key];
    const overVal = override[key];
    if (Array.isArray(baseVal) && Array.isArray(overVal)) {
      result[key] = [...baseVal, ...overVal];
    } else if (typeof baseVal === 'object' && baseVal !== null && typeof overVal === 'object' && overVal !== null && !Array.isArray(overVal)) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}

/**
 * 加载规则配置（全局 + 项目级，项目级覆盖全局）
 * 全局路径: ~/.fittencode/.project-rules.json
 * 项目路径: <project_root>/.project-rules.json
 * @param {string} root - 项目根目录
 * @returns {object} 包含 merged, global, project 的对象
 */
function loadRules(root) {
  const globalDir = getGlobalConfigDir();
  const globalFile = globalDir ? path.join(globalDir, '.project-rules.json') : '';
  const projectFile = path.join(root, '.project-rules.json');

  const globalRules = globalFile ? readJsonFile(globalFile) : null;
  const projectRules = readJsonFile(projectFile);

  const merged = deepMerge(globalRules, projectRules);

  return {
    merged: merged || null,
    global: globalRules,
    project: projectRules,
    globalPath: globalFile || null,
    projectPath: projectFile
  };
}

/**
 * 加载记忆配置（全局 + 项目级，项目级覆盖全局）
 * 全局路径: ~/.fittencode/.project-memory.json
 * 项目路径: <project_root>/.project-memory.json
 * @param {string} root - 项目根目录
 * @returns {object} 包含 merged, global, project 的对象
 */
function loadMemory(root) {
  const globalDir = getGlobalConfigDir();
  const globalFile = globalDir ? path.join(globalDir, '.project-memory.json') : '';
  const projectFile = path.join(root, '.project-memory.json');

  const globalMemory = globalFile ? readJsonFile(globalFile) : null;
  const projectMemory = readJsonFile(projectFile);

  const merged = deepMerge(globalMemory, projectMemory);

  return {
    merged: merged || null,
    global: globalMemory,
    project: projectMemory,
    globalPath: globalFile || null,
    projectPath: projectFile
  };
}

/**
 * 生成项目规则文档 (rules.md)
 * 包含命名约定、代码限制、Git 工作流、代码风格、自定义规则
 * @param {object} rulesInfo - 包含 merged, global, project, globalPath, projectPath 的对象（由 loadRules 返回）
 * @param {object} config - 自动检测的配置信息
 * @returns {string} Markdown 格式的规则文档
 */
function generateRulesMd(rulesInfo, config) {
  const { merged: rules, global: globalRules, project: projectRules, globalPath, projectPath } = rulesInfo || {};

  let md = '# 项目规则\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  if (globalRules || projectRules) {
    md += '## 配置来源\n\n';
    if (globalRules && globalPath) md += `- **全局配置**: \`${globalPath}\` ✓\n`;
    else md += `- **全局配置**: 未配置\n`;
    if (projectRules && projectPath) md += `- **项目配置**: \`${projectPath}\` ✓\n`;
    else md += `- **项目配置**: 未配置\n`;
    md += '\n';
  }

  if (!rules) {
    md += '_暂无自定义规则配置。_\n\n';
    md += '## 配置方式\n\n';
    md += '创建 `.project-rules.json` 文件进行配置。支持以下两级：\n\n';
    md += '- **全局配置**: `~/.fittencode/.project-rules.json` (对所有项目生效)\n';
    md += '- **项目配置**: `<项目根目录>/.project-rules.json` (仅当前项目生效，覆盖全局)\n\n';
    md += '### JSON 示例\n\n';
    md += '```json\n';
    md += jsonExample.rules + '\n';
    md += '```\n';
  } else {
    if (rules.naming) {
      md += '## 命名约定\n\n';
      md += '| 类型 | 约定 |\n|------|------|\n';
      if (rules.naming.variables) md += `| **变量** | \`${rules.naming.variables}\` |\n`;
      if (rules.naming.functions) md += `| **函数** | \`${rules.naming.functions}\` |\n`;
      if (rules.naming.classes) md += `| **类** | \`${rules.naming.classes}\` |\n`;
      if (rules.naming.constants) md += `| **常量** | \`${rules.naming.constants}\` |\n`;
      if (rules.naming.files) md += `| **文件** | \`${rules.naming.files}\` |\n`;
      md += '\n';
    }
    if (rules.limits) {
      md += '## 代码限制\n\n';
      if (rules.limits.maxFileLength) md += `- **最大文件行数**: ${rules.limits.maxFileLength}\n`;
      if (rules.limits.maxFunctionLength) md += `- **最大函数行数**: ${rules.limits.maxFunctionLength}\n`;
      if (rules.limits.maxLineLength) md += `- **最大行长度**: ${rules.limits.maxLineLength}\n`;
      md += '\n';
    }
    if (rules.git) {
      md += '## Git 工作流\n\n';
      if (rules.git.commitFormat) md += `- **提交格式**: ${rules.git.commitFormat}\n`;
      if (rules.git.branchPrefix) md += `- **分支前缀**: \`${rules.git.branchPrefix}\`\n`;
      md += '\n';
    }
    if (rules.codeStyle) {
      md += '## 代码风格\n\n';
      if (rules.codeStyle.semi !== undefined) md += `- **分号**: ${rules.codeStyle.semi ? '启用' : '禁用'}\n`;
      if (rules.codeStyle.singleQuote !== undefined) md += `- **引号**: ${rules.codeStyle.singleQuote ? '单引号' : '双引号'}\n`;
      if (rules.codeStyle.trailingComma) md += `- **尾逗号**: ${rules.codeStyle.trailingComma}\n`;
      md += '\n';
    }
    if (rules.customRules && rules.customRules.length > 0) {
      md += '## 自定义规则\n\n';
      rules.customRules.forEach(rule => { md += `- ${rule}\n`; });
      md += '\n';
    }

    md += '## JSON 配置示例\n\n';
    md += '```json\n';
    md += jsonExample.rules + '\n';
    md += '```\n';
  }

  if (config.linters.length > 0) {
    md += '## Linter 配置\n\n';
    md += `- **启用的 Linter**: ${config.linters.join(', ')}\n\n`;
  }

  return md;
}

/**
 * 生成项目记忆文档 (memory.md)
 * 包含用户偏好、项目知识、历史决策等
 * @param {object} memoryInfo - 包含 merged, global, project, globalPath, projectPath 的对象（由 loadMemory 返回）
 * @returns {string} Markdown 格式的记忆文档
 */
function generateMemoryMd(memoryInfo) {
  const { merged: memory, global: globalMemory, project: projectMemory, globalPath, projectPath } = memoryInfo || {};

  let md = '# 项目记忆\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  if (globalMemory || projectMemory) {
    md += '## 配置来源\n\n';
    if (globalMemory && globalPath) md += `- **全局配置**: \`${globalPath}\` ✓\n`;
    else md += `- **全局配置**: 未配置\n`;
    if (projectMemory && projectPath) md += `- **项目配置**: \`${projectPath}\` ✓\n`;
    else md += `- **项目配置**: 未配置\n`;
    md += '\n';
  }

  if (!memory) {
    md += '_暂无项目记忆配置。_\n\n';
    md += '## 配置方式\n\n';
    md += '创建 `.project-memory.json` 文件进行配置。支持以下两级：\n\n';
    md += '- **全局配置**: `~/.fittencode/.project-memory.json` (对所有项目生效)\n';
    md += '- **项目配置**: `<项目根目录>/.project-memory.json` (仅当前项目生效，覆盖全局)\n\n';
    md += '### JSON 示例\n\n';
    md += '```json\n';
    md += jsonExample.memory + '\n';
    md += '```\n';
    return md;
  }

  if (memory.language) {
    md += '## 语言偏好\n\n';
    if (memory.language.response) md += `- **回复语言**: ${memory.language.response}\n`;
    if (memory.language.comments) md += `- **注释语言**: ${memory.language.comments}\n`;
    if (memory.language.documentation) md += `- **文档语言**: ${memory.language.documentation}\n`;
    md += '\n';
  }
  if (memory.style) {
    md += '## 风格偏好\n\n';
    if (memory.style.responseDetail) md += `- **回复详细度**: ${memory.style.responseDetail}\n`;
    if (memory.style.codeExplanation) md += `- **代码解释**: ${memory.style.codeExplanation}\n`;
    md += '\n';
  }
  if (memory.project) {
    md += '## 项目信息\n\n';
    if (memory.project.description) md += `- **描述**: ${memory.project.description}\n`;
    if (memory.project.architecture) md += `- **架构**: ${memory.project.architecture}\n`;
    if (memory.project.knownIssues && memory.project.knownIssues.length > 0) {
      md += '- **已知问题**:\n';
      memory.project.knownIssues.forEach(issue => { md += `  - ${issue}\n`; });
    }
    md += '\n';
  }
  if (memory.history && memory.history.length > 0) {
    md += '## 历史决策\n\n';
    memory.history.forEach(decision => {
      md += `### ${decision.date} - ${decision.decision}\n\n`;
      md += `- **原因**: ${decision.reason}\n\n`;
    });
  }

  md += '## JSON 配置示例\n\n';
  md += '```json\n';
  md += jsonExample.memory + '\n';
  md += '```\n';

  return md;
}

/**
 * 生成配置信息文档 (config.md)
 * 包含包管理器、技术栈、依赖、构建脚本、配置文件等
 * @param {object} config - 检测到的配置信息
 * @param {string} root - 项目根目录
 * @returns {string} Markdown 格式的配置文档
 */
function generateConfigMd(config, root) {
  let md = '# 配置信息\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  md += '## 包管理\n\n';
  md += `- **包管理器**: ${config.packageManager || '未检测'}\n`;
  md += `- **TypeScript**: ${config.typescript ? `启用 (strict: ${config.typescript.strict}, target: ${config.typescript.target}, module: ${config.typescript.module})` : '未启用'}\n\n`;

  md += '## 技术栈\n\n';
  if (config.frameworks.length > 0) md += `- **框架**: ${config.frameworks.join(', ')}\n`;
  if (config.buildTools.length > 0) md += `- **构建工具**: ${config.buildTools.join(', ')}\n`;
  md += `- **代码检查**: ${config.linters.join(', ') || '未配置'}\n`;
  md += `- **测试框架**: ${config.testFramework || '未配置'}\n\n`;

  if (Object.keys(config.scripts).length > 0) {
    md += '## 构建脚本\n\n';
    md += '| 命令 | 说明 |\n|------|------|\n';
    for (const [name, cmd] of Object.entries(config.scripts)) {
      md += `| \`${name}\` | \`${cmd}\` |\n`;
    }
    md += '\n';
  }

  if (config.dependencies) {
    const prodDeps = Object.entries(config.dependencies.production || {});
    const devDeps = Object.entries(config.dependencies.development || {});
    if (prodDeps.length > 0) {
      md += '## 生产依赖\n\n';
      md += '| 包名 | 版本 |\n|------|------|\n';
      for (const [name, version] of prodDeps) md += `| ${name} | ${version} |\n`;
      md += '\n';
    }
    if (devDeps.length > 0) {
      md += '## 开发依赖\n\n';
      md += '| 包名 | 版本 |\n|------|------|\n';
      for (const [name, version] of devDeps) md += `| ${name} | ${version} |\n`;
      md += '\n';
    }
  }

  const configFileDescriptions = {
    'tsconfig.json': 'TypeScript 编译器配置', 'package.json': '项目元信息与依赖管理',
    'webpack.config.js': 'Webpack 构建配置', 'vite.config.js': 'Vite 构建配置',
    '.eslintrc': 'ESLint 代码检查规则', '.prettierrc': 'Prettier 代码格式化规则',
    'postcss.config.js': 'PostCSS 处理器配置', '.babelrc': 'Babel 编译配置'
  };
  const foundConfigs = Object.keys(configFileDescriptions).filter(name => {
    const p = path.join(root, name);
    return fs.existsSync(p) || fs.existsSync(p + '.json') || fs.existsSync(p + '.js');
  });
  if (foundConfigs.length > 0) {
    md += '## 配置文件说明\n\n';
    md += '| 文件 | 说明 |\n|------|------|\n';
    for (const name of foundConfigs) md += `| \`${name}\` | ${configFileDescriptions[name]} |\n`;
    md += '\n';
  }

  return md;
}

/**
 * 生成模块分析文档 (modules.md)
 * 当 contextDir 有值时，按模块拆分为 .context/modules/ 下的子文件，modules.md 作为索引
 * 当 contextDir 为空时，生成单个完整文件（兼容旧用法）
 * @param {Array} allFiles - 所有扫描到的文件信息
 * @param {Array} dirStructure - 目录结构信息
 * @param {string} [contextDir] - .context/ 目录路径（可选）
 * @returns {string} Markdown 格式的模块索引文档
 */
function generateModulesMd(allFiles, dirStructure, contextDir) {
  const modules = {};
  for (const file of allFiles) {
    const parts = file.path.split(path.sep);
    if (parts.length > 1) {
      const modulePath = parts.slice(0, -1).join(path.sep);
      if (!modules[modulePath]) modules[modulePath] = [];
      modules[modulePath].push(file);
    } else {
      if (!modules['_root']) modules['_root'] = [];
      modules['_root'].push(file);
    }
  }

  const shouldSplit = !!contextDir && Object.keys(modules).length > 3;

  if (shouldSplit) {
    return generateModulesSplit(allFiles, dirStructure, modules, contextDir);
  }

  // 单文件模式（兼容旧用法）
  let md = '# 模块分析\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;
  md += buildModuleIndex(md, modules);

  md += '## 目录结构\n\n```tree\n';
  md += buildTree(dirStructure) + '\n```\n\n';

  md += '## 模块详情\n\n';
  for (const [moduleName, files] of Object.entries(modules)) {
    md += generateModuleSection(moduleName, files);
  }

  return md;
}

/**
 * 拆分模式：将各模块写入独立子文件，返回索引文件内容
 */
function generateModulesSplit(allFiles, dirStructure, modules, contextDir) {
  const modulesSubDir = path.join(contextDir, 'modules');
  if (!fs.existsSync(modulesSubDir)) {
    fs.mkdirSync(modulesSubDir, { recursive: true });
  }

  // 写入每个模块的子文件
  for (const [moduleName, files] of Object.entries(modules)) {
    const section = generateModuleSection(moduleName, files);
    const fileName = moduleNameToFileName(moduleName);
    const sectionMd = `# 模块: ${moduleName === '_root' ? '(根目录)' : moduleName}\n\n${section}`;
    fs.writeFileSync(path.join(modulesSubDir, `${fileName}.md`), sectionMd, 'utf-8');
  }

  // 生成索引文件
  let md = '# 模块分析\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n`;
  md += `> 模块数: ${Object.keys(modules).length}（已拆分为子文件）\n\n`;

  md += '## 目录结构\n\n```tree\n';
  md += buildTree(dirStructure) + '\n```\n\n';

  md += buildModuleIndex('', modules);
  return md;
}

/**
 * 构建模块索引表格（带链接或无链接）
 */
function buildModuleIndex(prefix, modules) {
  let md = prefix;
  md += '## 模块列表\n\n';
  md += '| 模块 | 文件数 | 总行数 |\n|------|--------|--------|\n';
  for (const [moduleName, files] of Object.entries(modules)) {
    const display = moduleName === '_root' ? '(根目录)' : moduleName;
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    const summary = inferModuleSummary(moduleName, files);
    const summaryShort = summary ? ` (${summary.slice(0, 20)}...)` : '';
    md += `| [${display}](./modules/${moduleNameToFileName(moduleName)}.md) | ${files.length} | ${totalLines}${summaryShort} |\n`;
  }
  md += '\n';
  return md;
}

/**
 * 生成单个模块的详细段落
 */
function generateModuleSection(moduleName, files) {
  const display = moduleName === '_root' ? '(根目录)' : moduleName;
  let md = `### ${display}\n\n`;

  const summary = inferModuleSummary(moduleName, files);
  if (summary) md += `> **模块用途**: ${summary}\n\n`;

  md += `- **文件数**: ${files.length}\n`;
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  md += `- **总行数**: ${totalLines}\n`;
  const exts = {};
  for (const f of files) exts[f.ext] = (exts[f.ext] || 0) + 1;
  md += `- **文件类型**: ${Object.entries(exts).map(([e, c]) => `${e}: ${c}`).join(', ')}\n`;

  const allFunctions = [];
  for (const f of files) {
    if (Array.isArray(f.functions)) {
      for (const fn of f.functions) {
        const fnName = typeof fn === 'object' ? fn.name : fn;
        const fnJSDoc = typeof fn === 'object' ? fn.jsdoc : '';
        allFunctions.push({ name: fnName, jsdoc: fnJSDoc, file: path.basename(f.path) });
      }
    }
  }

  const functionsWithDocs = allFunctions.filter(fn => fn.jsdoc);
  if (functionsWithDocs.length > 0) {
    md += '\n**函数说明**:\n';
    for (const fn of functionsWithDocs.slice(0, 30)) {
      md += `- \`${fn.name}\` — ${fn.jsdoc}（${fn.file}）\n`;
    }
    md += '\n';
  }

  const allExports = [];
  for (const f of files) allExports.push(...f.exports.map(e => `${f.path}:${e}`));
  if (allExports.length > 0) {
    md += '**主要导出**:\n';
    for (const exp of allExports.slice(0, 20)) md += `- ${exp}\n`;
    md += '\n';
  }

  md += '| 文件 | 行数 | 导出 |\n|------|------|------|\n';
  for (const f of files.slice(0, 30)) md += `| ${f.path} | ${f.lines} | ${f.exports.slice(0, 3).join(', ') || '-'} |\n`;
  if (files.length > 30) md += `| ... | 还有 ${files.length - 30} 个文件 |\n`;
  md += '\n';

  return md;
}

/**
 * 将模块路径转换为安全的文件名
 * @param {string} moduleName - 模块路径
 * @returns {string} 安全的文件名（不含扩展名）
 */
function moduleNameToFileName(moduleName) {
  if (moduleName === '_root') return 'root';
  return moduleName.replace(/[\/\\]+/g, '-');
}

/**
 * 根据模块路径和文件内容推断模块用途摘要
 * @param {string} moduleName - 模块路径
 * @param {Array} files - 模块中的文件列表
 * @returns {string} 模块用途描述，无法推断时返回空字符串
 */
function inferModuleSummary(moduleName, files) {
  if (!moduleName || moduleName === '_root') return '项目根目录，包含入口文件和全局配置';

  const parts = moduleName.split(path.sep);
  const dirNames = parts.map(p => p.toLowerCase());
  const fileNameStems = files.map(f => path.basename(f.path, path.extname(f.path)).toLowerCase());
  const hasModel = dirNames.includes('model') || fileNameStems.some(n => ['store', 'model', 'state'].includes(n));
  const hasPage = dirNames.includes('pages') || dirNames.includes('page') || fileNameStems.some(n => n === 'index');
  const hasComponent = dirNames.includes('components') || dirNames.includes('component') || fileNameStems.some(n => n.endsWith('component'));
  const hasApi = fileNameStems.some(n => n === 'server' || n === 'api' || n === 'request');
  const hasStyle = fileNameStems.some(n => n.endsWith('module')) || files.some(f => ['.less', '.scss', '.sass', '.css'].includes(f.ext));
  const hasUtil = dirNames.includes('utils') || dirNames.includes('util') || dirNames.includes('helpers') || fileNameStems.some(n => n === 'const' || n === 'helper');
  const hasAsset = dirNames.includes('assets') || dirNames.includes('static') || dirNames.includes('image') || dirNames.includes('icon');

  // 通用结构描述
  if (hasPage && hasComponent && hasModel) return '完整功能模块，包含页面、组件和数据层';
  if (hasPage && hasModel) return '功能页面模块，包含页面组件和数据逻辑';
  if (hasComponent && hasModel) return '可复用组件库，包含组件和状态管理';
  if (hasPage) return '页面模块，主要负责 UI 展示和路由';
  if (hasComponent) return '组件模块，提供可复用的 UI 组件';
  if (hasModel) return '数据层模块，负责状态管理和 API 交互';
  if (hasUtil) return '工具函数模块，提供通用辅助方法';
  if (hasAsset) return '静态资源目录，包含图片、样式等文件';
  if (hasApi) return 'API 接口模块，负责服务端通信';
  if (hasStyle) return '样式模块，定义组件样式';

  return '';
}

/**
 * 构建目录树字符串（用于 modules.md 的 tree 展示）
 * @param {Array} dirStructure - 目录结构数组
 * @returns {string} 树形结构文本
 */
function buildTree(dirStructure) {
  const lines = [];
  const treeMap = {};
  for (const dir of dirStructure) {
    const parts = dir.path.split(path.sep);
    let current = treeMap;
    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }
  function renderTree(obj, prefix = '') {
    for (const [name, children] of Object.entries(obj)) {
      lines.push(`${prefix}├── ${name}/`);
      if (Object.keys(children).length > 0) renderTree(children, prefix + '│   ');
    }
  }
  renderTree(treeMap);
  return lines.join('\n');
}

/**
 * 生成代码风格文档 (code-style.md)
 * 包含语言分布、TypeScript 配置、代码规范工具、命名约定、代码组织等
 * @param {Array} allFiles - 所有扫描到的文件信息
 * @param {object} config - 检测到的配置信息
 * @returns {string} Markdown 格式的代码风格文档
 */
function generateCodeStyleMd(allFiles, config) {
  let md = '# 代码风格\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  md += '## 语言分布\n\n';
  const extStats = {};
  for (const file of allFiles) extStats[file.ext] = (extStats[file.ext] || 0) + 1;
  md += '| 扩展名 | 文件数 |\n|--------|--------|\n';
  for (const [ext, count] of Object.entries(extStats).sort((a, b) => b[1] - a[1])) md += `| ${ext} | ${count} |\n`;
  md += '\n';

  if (config.typescript) {
    md += '## TypeScript 配置\n\n';
    md += `- **严格模式**: ${config.typescript.strict ? '开启' : '关闭'}\n`;
    md += `- **目标版本**: ${config.typescript.target}\n`;
    md += `- **模块系统**: ${config.typescript.module}\n\n`;
  }

  md += '## 代码规范工具\n\n';
  md += `- **检查工具**: ${config.linters.join(', ') || '未配置'}\n`;
  md += `- **测试框架**: ${config.testFramework || '未配置'}\n\n`;

  md += '## 命名约定\n\n';
  const camelCaseFiles = allFiles.filter(f => /[a-z]+[A-Z]/.test(path.basename(f.path, path.extname(f.path)))).length;
  const snakeFiles = allFiles.filter(f => /[a-z]+_[a-z]/.test(path.basename(f.path, path.extname(f.path)))).length;
  const kebabFiles = allFiles.filter(f => /[a-z]+-[a-z]/.test(path.basename(f.path, path.extname(f.path)))).length;
  if (camelCaseFiles > 0) md += `- **CamelCase**: ${camelCaseFiles} 个文件使用驼峰命名\n`;
  if (snakeFiles > 0) md += `- **snake_case**: ${snakeFiles} 个文件使用下划线命名\n`;
  if (kebabFiles > 0) md += `- **kebab-case**: ${kebabFiles} 个文件使用中划线命名\n`;
  md += '\n';

  md += '## 代码组织\n\n';
  const srcFiles = allFiles.filter(f => f.path.includes('src'));
  const testFiles = allFiles.filter(f => f.path.includes('test') || f.path.includes('__tests__'));
  const componentFiles = allFiles.filter(f => f.path.includes('component') || f.path.includes('Component'));
  const pageFiles = allFiles.filter(f => f.path.includes('page') || f.path.includes('Page'));
  md += `- **源代码文件**: ${srcFiles.length}\n`;
  md += `- **测试文件**: ${testFiles.length}\n`;
  if (componentFiles.length > 0) md += `- **组件文件**: ${componentFiles.length}\n`;
  if (pageFiles.length > 0) md += `- **页面文件**: ${pageFiles.length}\n`;
  md += '\n';

  return md;
}

/**
 * 统计模块数量
 * @param {Array} allFiles - 所有扫描到的文件信息
 * @returns {number} 模块数量
 */
function countModules(allFiles) {
  const modules = {};
  for (const file of allFiles) {
    const parts = file.path.split(path.sep);
    if (parts.length > 1) {
      const modulePath = parts.slice(0, -1).join(path.sep);
      modules[modulePath] = true;
    } else {
      modules['_root'] = true;
    }
  }
  return Object.keys(modules).length;
}

module.exports = {
  loadRules, loadMemory,
  generateRulesMd, generateMemoryMd, generateConfigMd, generateModulesMd, generateCodeStyleMd, buildTree, countModules
};
