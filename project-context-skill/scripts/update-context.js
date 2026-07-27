// Project Context Analyzer
// 深度分析项目并生成 .context/ 目录下的详细文档

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 忽略的目录
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', 'tmp', '.tmp', '.vscode', '.idea', '__pycache__', '.DS_Store', 'logs', '.context'];

// 代码文件扩展名
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.py', '.java', '.go', '.rs', '.css', '.less', '.scss', '.sass', '.html', '.ejs']);

function md5(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

function scanAllFiles(root, currentPath = '', results = []) {
  const items = fs.readdirSync(root, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && !IGNORE_DIRS.includes(item.name)) {
      scanAllFiles(path.join(root, item.name), path.join(currentPath, item.name), results);
    } else if (item.isFile() && CODE_EXTENSIONS.has(path.extname(item.name))) {
      const fullPath = path.join(root, item.name);
      const content = readTextFile(fullPath);
      if (content) {
        results.push({
          path: path.join(currentPath, item.name),
          size: content.length,
          lines: content.split('\n').length,
          ext: path.extname(item.name),
          md5: md5(content),
          imports: extractImports(content, path.extname(item.name)),
          exports: extractExports(content, path.extname(item.name)),
          functions: extractFunctions(content, path.extname(item.name))
        });
      }
    }
  }
  return results;
}

function extractImports(content, ext) {
  const imports = [];
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }
  return imports.slice(0, 50);
}

function extractExports(content, ext) {
  const exports = [];
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
  }
  return exports.slice(0, 30);
}

function extractFunctions(content, ext) {
  const functions = [];
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    const fnRegex = /(?:function|const|let|var)\s+(\w+)\s*\(/g;
    let match;
    while ((match = fnRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
  }
  return functions.slice(0, 50);
}

function detectConfigurations(root) {
  const config = {
    packageManager: null,
    typescript: null,
    linters: [],
    testFramework: null,
    frameworks: [],
    buildTools: []
  };

  // 包管理器
  if (fs.existsSync(path.join(root, 'package-lock.json'))) config.packageManager = 'npm';
  else if (fs.existsSync(path.join(root, 'yarn.lock'))) config.packageManager = 'yarn';
  else if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) config.packageManager = 'pnpm';

  // TypeScript
  const tsConfig = readJsonFile(path.join(root, 'tsconfig.json'));
  if (tsConfig) {
    config.typescript = {
      strict: tsConfig.compilerOptions?.strict || false,
      target: tsConfig.compilerOptions?.target || 'ES2020',
      module: tsConfig.compilerOptions?.module || 'commonjs'
    };
  }

  // Linters & formatters
  if (fs.existsSync(path.join(root, '.eslintrc.json')) || fs.existsSync(path.join(root, '.eslintrc.js')) || fs.existsSync(path.join(root, '.eslintrc'))) config.linters.push('eslint');
  if (fs.existsSync(path.join(root, '.prettierrc')) || fs.existsSync(path.join(root, '.prettierrc.json'))) config.linters.push('prettier');

  // 读取 package.json 分析依赖
  const pkg = readJsonFile(path.join(root, 'package.json'));
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    // 测试框架
    if (allDeps.jest) config.testFramework = 'jest';
    if (allDeps.vitest) config.testFramework = 'vitest';
    if (allDeps.mocha) config.testFramework = 'mocha';

    // 框架检测
    if (allDeps.react) config.frameworks.push('React');
    if (allDeps.vue) config.frameworks.push('Vue');
    if (allDeps['@angular/core']) config.frameworks.push('Angular');
    if (allDeps.next) config.frameworks.push('Next.js');
    if (allDeps.nuxt) config.frameworks.push('Nuxt');
    if (allDeps.express) config.frameworks.push('Express');

    // 构建工具
    if (allDeps.webpack) config.buildTools.push('Webpack');
    if (allDeps.vite) config.buildTools.push('Vite');
    if (allDeps.rollup) config.buildTools.push('Rollup');
    if (allDeps['esbuild']) config.buildTools.push('esbuild');

    config.dependencies = {
      production: pkg.dependencies || {},
      development: pkg.devDependencies || {}
    };
    config.scripts = pkg.scripts || {};
  }

  return config;
}

function analyzeDirectoryStructure(root) {
  const structure = [];
  function scan(dir, relPath = '', depth = 0) {
    if (depth > 5) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && !IGNORE_DIRS.includes(item.name)) {
        const subPath = path.join(dir, item.name);
        const subRel = path.join(relPath, item.name);
        const files = fs.readdirSync(subPath).filter(f => !f.startsWith('.')).length;
        const codeFiles = fs.readdirSync(subPath).filter(f => CODE_EXTENSIONS.has(path.extname(f))).length;
        structure.push({ path: subRel, depth, totalFiles: files, codeFiles });
        scan(subPath, subRel, depth + 1);
      }
    }
  }
  scan(root);
  return structure;
}

function buildDependencyGraph(allFiles) {
  const graph = {};
  for (const file of allFiles) {
    if (file.imports.length > 0) {
      graph[file.path] = file.imports;
    }
  }
  return graph;
}

function generateConfigMd(config, root) {
  let md = '# 配置信息\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  // 包管理
  md += '## 包管理\n\n';
  md += `- **包管理器**: ${config.packageManager || '未检测'}\n`;
  md += `- **TypeScript**: ${config.typescript ? `启用 (strict: ${config.typescript.strict}, target: ${config.typescript.target}, module: ${config.typescript.module})` : '未启用'}\n\n`;

  // 框架与技术栈
  md += '## 技术栈\n\n';
  if (config.frameworks.length > 0) md += `- **框架**: ${config.frameworks.join(', ')}\n`;
  if (config.buildTools.length > 0) md += `- **构建工具**: ${config.buildTools.join(', ')}\n`;
  md += `- **代码检查**: ${config.linters.join(', ') || '未配置'}\n`;
  md += `- **测试框架**: ${config.testFramework || '未配置'}\n\n`;

  // 构建脚本
  if (Object.keys(config.scripts).length > 0) {
    md += '## 构建脚本\n\n';
    md += '| 命令 | 说明 |\n|------|------|\n';
    for (const [name, cmd] of Object.entries(config.scripts)) {
      md += `| \`${name}\` | \`${cmd}\` |\n`;
    }
    md += '\n';
  }

  // 依赖
  if (config.dependencies) {
    const prodDeps = Object.entries(config.dependencies.production || {});
    const devDeps = Object.entries(config.dependencies.development || {});
    if (prodDeps.length > 0) {
      md += '## 生产依赖\n\n';
      md += '| 包名 | 版本 |\n|------|------|\n';
      for (const [name, version] of prodDeps) {
        md += `| ${name} | ${version} |\n`;
      }
      md += '\n';
    }
    if (devDeps.length > 0) {
      md += '## 开发依赖\n\n';
      md += '| 包名 | 版本 |\n|------|------|\n';
      for (const [name, version] of devDeps) {
        md += `| ${name} | ${version} |\n`;
      }
      md += '\n';
    }
  }

  // 配置文件内容
  const configFileDescriptions = {
    'tsconfig.json': 'TypeScript 编译器配置',
    'package.json': '项目元信息与依赖管理',
    'webpack.config.js': 'Webpack 构建配置',
    'vite.config.js': 'Vite 构建配置',
    '.eslintrc': 'ESLint 代码检查规则',
    '.prettierrc': 'Prettier 代码格式化规则',
    'postcss.config.js': 'PostCSS 处理器配置',
    '.babelrc': 'Babel 编译配置'
  };

  const foundConfigs = Object.keys(configFileDescriptions).filter(name => {
    const p = path.join(root, name);
    return fs.existsSync(p) || fs.existsSync(p + '.json') || fs.existsSync(p + '.js');
  });

  if (foundConfigs.length > 0) {
    md += '## 配置文件说明\n\n';
    md += '| 文件 | 说明 |\n|------|------|\n';
    for (const name of foundConfigs) {
      const desc = configFileDescriptions[name];
      md += `| \`${name}\` | ${desc} |\n`;
    }
    md += '\n';
  }

  return md;
}

function generateModulesMd(allFiles, dirStructure) {
  let md = '# 模块分析\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  // 按目录分组
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

  // 目录结构
  md += '## 目录结构\n\n';
  md += '```tree\n';
  const tree = buildTree(dirStructure);
  md += tree + '\n';
  md += '```\n\n';

  // 模块详情
  md += '## 模块详情\n\n';
  for (const [moduleName, files] of Object.entries(modules)) {
    const display = moduleName === '_root' ? '(根目录)' : moduleName;
    md += `### ${display}\n\n`;
    md += `- **文件数**: ${files.length}\n`;
    
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    md += `- **总行数**: ${totalLines}\n`;

    const exts = {};
    for (const f of files) {
      exts[f.ext] = (exts[f.ext] || 0) + 1;
    }
    md += `- **文件类型**: ${Object.entries(exts).map(([e, c]) => `${e}: ${c}`).join(', ')}\n\n`;

    // 导出内容
    const allExports = [];
    for (const f of files) allExports.push(...f.exports.map(e => `${f.path}:${e}`));
    if (allExports.length > 0) {
      md += '**主要导出**:\n';
      for (const exp of allExports.slice(0, 20)) {
        md += `- ${exp}\n`;
      }
      md += '\n';
    }

    // 文件列表
    md += '| 文件 | 行数 | 导出 |\n|------|------|------|\n';
    for (const f of files.slice(0, 30)) {
      md += `| ${f.path} | ${f.lines} | ${f.exports.slice(0, 3).join(', ') || '-'} |\n`;
    }
    if (files.length > 30) md += `| ... | 还有 ${files.length - 30} 个文件 |\n`;
    md += '\n';
  }

  return md;
}

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
      if (Object.keys(children).length > 0) {
        renderTree(children, prefix + '│   ');
      }
    }
  }
  renderTree(treeMap);
  return lines.join('\n');
}

function generateCodeStyleMd(allFiles, config) {
  let md = '# 代码风格\n\n';
  md += `> 生成时间: ${new Date().toISOString()}\n\n`;

  // 语言统计
  md += '## 语言分布\n\n';
  const extStats = {};
  for (const file of allFiles) {
    extStats[file.ext] = (extStats[file.ext] || 0) + 1;
  }
  md += '| 扩展名 | 文件数 |\n|--------|--------|\n';
  for (const [ext, count] of Object.entries(extStats).sort((a, b) => b[1] - a[1])) {
    md += `| ${ext} | ${count} |\n`;
  }
  md += '\n';

  // TypeScript 配置
  if (config.typescript) {
    md += '## TypeScript 配置\n\n';
    md += `- **严格模式**: ${config.typescript.strict ? '开启' : '关闭'}\n`;
    md += `- **目标版本**: ${config.typescript.target}\n`;
    md += `- **模块系统**: ${config.typescript.module}\n\n`;
  }

  // 代码检查工具
  md += '## 代码规范工具\n\n';
  md += `- **检查工具**: ${config.linters.join(', ') || '未配置'}\n`;
  md += `- **测试框架**: ${config.testFramework || '未配置'}\n\n`;

  // 命名约定分析
  md += '## 命名约定\n\n';
  const camelCaseFiles = allFiles.filter(f => /[a-z]+[A-Z]/.test(path.basename(f.path, path.extname(f.path)))).length;
  const snakeFiles = allFiles.filter(f => /[a-z]+_[a-z]/.test(path.basename(f.path, path.extname(f.path)))).length;
  const kebabFiles = allFiles.filter(f => /[a-z]+-[a-z]/.test(path.basename(f.path, path.extname(f.path)))).length;
  if (camelCaseFiles > 0) md += `- **CamelCase**: ${camelCaseFiles} 个文件使用驼峰命名\n`;
  if (snakeFiles > 0) md += `- **snake_case**: ${snakeFiles} 个文件使用下划线命名\n`;
  if (kebabFiles > 0) md += `- **kebab-case**: ${kebabFiles} 个文件使用中划线命名\n`;
  md += '\n';

  // 代码组织
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

  // 6. 生成索引文件
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

## 项目概览

- **框架**: ${config.frameworks.join(', ') || '未检测'}
- **构建工具**: ${config.buildTools.join(', ') || '未检测'}
- **代码文件**: ${allFiles.length} 个
- **目录数**: ${dirStructure.length} 个
- **模块数**: ${Object.keys(depGraph).length} 个有依赖关系
`;
  fs.writeFileSync(path.join(contextDir, 'index.md'), indexMd, 'utf-8');

  console.log(`\n✓ 项目分析完成! 文档已生成到: ${contextDir}`);
  console.log(`  - index.md (索引)`);
  console.log(`  - config.md (配置信息)`);
  console.log(`  - modules.md (模块分析)`);
  console.log(`  - code-style.md (代码风格)`);
  console.log(`  - dependencies.json (依赖关系)`);

  return { success: true, contextDir };
}

// CLI
const projectRoot = process.argv[2] || process.cwd();
updateContext(projectRoot).catch(err => {
  console.error('分析失败:', err);
  process.exit(1);
});

module.exports = { updateContext };