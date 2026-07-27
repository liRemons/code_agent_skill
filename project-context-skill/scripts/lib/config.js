/**
 * 配置检测模块
 * 检测项目的包管理器、TypeScript、Linter、测试框架、框架、构建工具等配置信息
 */

const fs = require('fs');
const { path, IGNORE_DIRS, CODE_EXTENSIONS, readJsonFile } = require('./utils');

/**
 * 检测项目配置信息
 * @param {string} root - 项目根目录
 * @returns {object} 包含包管理器、TypeScript、Linter、测试框架、框架、构建工具、依赖、脚本等信息
 */
function detectConfigurations(root) {
  const config = {
    packageManager: null,
    typescript: null,
    linters: [],
    testFramework: null,
    frameworks: [],
    buildTools: []
  };

  // 检测包管理器（根据 lock 文件判断）
  if (fs.existsSync(path.join(root, 'package-lock.json'))) config.packageManager = 'npm';
  else if (fs.existsSync(path.join(root, 'yarn.lock'))) config.packageManager = 'yarn';
  else if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) config.packageManager = 'pnpm';

  // 检测 TypeScript 配置
  const tsConfig = readJsonFile(path.join(root, 'tsconfig.json'));
  if (tsConfig) {
    config.typescript = {
      strict: tsConfig.compilerOptions?.strict || false,
      target: tsConfig.compilerOptions?.target || 'ES2020',
      module: tsConfig.compilerOptions?.module || 'commonjs'
    };
  }

  // 检测代码检查工具
  if (fs.existsSync(path.join(root, '.eslintrc.json')) || fs.existsSync(path.join(root, '.eslintrc.js')) || fs.existsSync(path.join(root, '.eslintrc'))) config.linters.push('eslint');
  if (fs.existsSync(path.join(root, '.prettierrc')) || fs.existsSync(path.join(root, '.prettierrc.json'))) config.linters.push('prettier');

  // 读取 package.json 分析依赖
  const pkg = readJsonFile(path.join(root, 'package.json'));
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // 检测测试框架
    if (allDeps.jest) config.testFramework = 'jest';
    if (allDeps.vitest) config.testFramework = 'vitest';
    if (allDeps.mocha) config.testFramework = 'mocha';

    // 检测前端/后端框架
    if (allDeps.react) config.frameworks.push('React');
    if (allDeps.vue) config.frameworks.push('Vue');
    if (allDeps['@angular/core']) config.frameworks.push('Angular');
    if (allDeps.next) config.frameworks.push('Next.js');
    if (allDeps.nuxt) config.frameworks.push('Nuxt');
    if (allDeps.express) config.frameworks.push('Express');

    // 检测构建工具
    if (allDeps.webpack) config.buildTools.push('Webpack');
    if (allDeps.vite) config.buildTools.push('Vite');
    if (allDeps.rollup) config.buildTools.push('Rollup');
    if (allDeps['esbuild']) config.buildTools.push('esbuild');

    // 保存依赖和脚本信息
    config.dependencies = {
      production: pkg.dependencies || {},
      development: pkg.devDependencies || {}
    };
    config.scripts = pkg.scripts || {};
  }

  return config;
}

/**
 * 分析项目目录结构
 * @param {string} root - 项目根目录
 * @returns {Array} 包含路径、深度、文件数、代码文件数的目录结构数组
 */
function analyzeDirectoryStructure(root) {
  const structure = [];
  function scan(dir, relPath = '', depth = 0) {
    if (depth > 5) return; // 限制最大深度
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

/**
 * 构建模块依赖关系图
 * @param {Array} allFiles - 所有扫描到的文件信息
 * @returns {object} 文件路径到导入路径列表的映射
 */
function buildDependencyGraph(allFiles) {
  const graph = {};
  for (const file of allFiles) {
    if (file.imports.length > 0) {
      graph[file.path] = file.imports;
    }
  }
  return graph;
}

module.exports = { detectConfigurations, analyzeDirectoryStructure, buildDependencyGraph };
