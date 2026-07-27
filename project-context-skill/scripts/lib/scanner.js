/**
 * 文件扫描模块
 * 递归扫描项目目录，提取代码文件的 imports、exports 和函数定义
 */

const fs = require('fs');
const { path, IGNORE_DIRS, CODE_EXTENSIONS, md5, readTextFile } = require('./utils');

/**
 * 递归扫描项目目录，收集所有代码文件信息
 * @param {string} root - 扫描根目录
 * @param {string} currentPath - 当前相对路径
 * @param {Array} results - 结果数组
 * @returns {Array} 包含文件路径、大小、行数、扩展名、MD5、imports、exports、functions 的对象数组
 */
function scanAllFiles(root, currentPath = '', results = []) {
  const items = fs.readdirSync(root, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory() && !IGNORE_DIRS.includes(item.name)) {
      // 递归扫描子目录
      scanAllFiles(path.join(root, item.name), path.join(currentPath, item.name), results);
    } else if (item.isFile() && CODE_EXTENSIONS.has(path.extname(item.name))) {
      // 读取代码文件并提取信息
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

/**
 * 从文件内容中提取 import/require 语句
 * @param {string} content - 文件内容
 * @param {string} ext - 文件扩展名
 * @returns {Array} 导入路径列表（最多 50 条）
 */
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

/**
 * 从文件内容中提取 export 声明
 * @param {string} content - 文件内容
 * @param {string} ext - 文件扩展名
 * @returns {Array} 导出名称列表（最多 30 条）
 */
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

/**
 * 从文件内容中提取函数定义
 * @param {string} content - 文件内容
 * @param {string} ext - 文件扩展名
 * @returns {Array} 函数名称列表（最多 50 条）
 */
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

module.exports = { scanAllFiles, extractImports, extractExports, extractFunctions };
