/**
 * 文档生成模块
 * 负责生成 .context/ 目录下的所有 Markdown 文档
 * 包括：项目规则、项目记忆、配置信息、模块分析、代码风格
 */

const fs = require('fs');
const { path, readJsonFile, readTextFile } = require('./utils');

/**
 * 从项目根目录加载用户自定义规则配置
 * @param {string} root - 项目根目录
 * @returns {object|null} 规则配置对象，文件不存在返回 null
 */
function loadProjectRules(root) {
  return readJsonFile(path.join(root, '.project-rules.json'));
}

/**
 * 从项目根目录加载用户记忆配置
 * @param {string} root - 项目根目录
 * @returns {object|null} 记忆配置对象，文件不存在返回 null
 */
function loadProjectMemory(root) {
  return readJsonFile(path.join(root, '.project-memory.json'));
}

/**
 * 生成项目规则文档 (rules.md)
 * 包含命名约定、代码限制、Git 工作流、代码风格、自定义规则
 * @param {object} rules - 用户自定义规则配置
 * @param {object} config - 自动检测的配置信息
 * @returns {string} Markdown 格式的规则文档
 */
function generateRulesMd(rules, config) {
  let md = '# 项目规则\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  if (!rules) {
    md += '_暂无自定义规则配置。请在项目根目录创建 `.project-rules.json` 文件。_\n\n';
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
 * @param {object|null} memory - 用户记忆配置对象
 * @returns {string} Markdown 格式的记忆文档
 */
function generateMemoryMd(memory) {
  let md = '# 项目记忆\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  if (!memory) {
    md += '_暂无项目记忆配置。请在项目根目录创建 `.project-memory.json` 文件。_\n';
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
 * 包含目录结构树、模块详情、文件列表、导出信息等
 * @param {Array} allFiles - 所有扫描到的文件信息
 * @param {Array} dirStructure - 目录结构信息
 * @returns {string} Markdown 格式的模块文档
 */
function generateModulesMd(allFiles, dirStructure) {
  let md = '# 模块分析\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

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

  md += '## 目录结构\n\n```tree\n';
  md += buildTree(dirStructure) + '\n```\n\n';

  md += '## 模块详情\n\n';
  for (const [moduleName, files] of Object.entries(modules)) {
    const display = moduleName === '_root' ? '(根目录)' : moduleName;
    md += `### ${display}\n\n`;
    md += `- **文件数**: ${files.length}\n`;
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    md += `- **总行数**: ${totalLines}\n`;
    const exts = {};
    for (const f of files) exts[f.ext] = (exts[f.ext] || 0) + 1;
    md += `- **文件类型**: ${Object.entries(exts).map(([e, c]) => `${e}: ${c}`).join(', ')}\n\n`;
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
  }

  return md;
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

module.exports = {
  loadProjectRules, loadProjectMemory,
  generateRulesMd, generateMemoryMd, generateConfigMd, generateModulesMd, generateCodeStyleMd, buildTree
};
