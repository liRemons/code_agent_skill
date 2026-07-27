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
 * 从文件内容中提取函数定义及其 JSDoc 注释
 * @param {string} content - 文件内容
 * @param {string} ext - 文件扩展名
 * @returns {Array} 函数信息对象数组 {name, jsdoc}（最多 50 条）
 */
function extractFunctions(content, ext) {
  const functions = [];
  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    const lines = content.split('\n');
    // 匹配函数定义：function name( / const name = ( / const name(
    const fnRegex = /^(?:\s*)(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|(\w+)\s*\([^)]*\)\s*\{?))/gm;
    let match;
    while ((match = fnRegex.exec(content)) !== null) {
      const name = match[1] || match[2] || match[3] || null;
      if (!name || ['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'class'].includes(name)) continue;
      
      // 提取函数上方的 JSDoc 注释
      const jsdoc = extractJSDocAbove(content, match.index);
      functions.push({ name, jsdoc });
    }
  }
  return functions.slice(0, 50);
}

/**
 * 从指定位置向前查找 JSDoc 注释块
 * @param {string} content - 文件完整内容
 * @param {number} position - 函数定义的起始位置
 * @returns {string} 清理后的 JSDoc 描述文本，无注释则返回空字符串
 */
function extractJSDocAbove(content, position) {
  const before = content.slice(0, position).trimEnd();
  const jsdocMatch = before.match(/\/\*\*\s*([\s\S]*?)\*\//);
  if (!jsdocMatch) return '';
  
  // 清理 JSDoc 内容：去除标记符号，提取 @returns 或描述文字
  let jsdoc = jsdocMatch[1]
    .replace(/\* @param/g, '\n@param')
    .replace(/\* @returns/g, '\n@returns')
    .replace(/\* @return/g, '\n@return')
    .replace(/\*\//, '')
    .replace(/^\*\s*\/\s*/, '')
    .replace(/\n\s*\*\s?/g, '\n')
    .trim();
  
  if (!jsdoc) return '';
  
  // 提取 @returns 或 @return 后面的描述
  const returnMatch = jsdoc.match(/@returns?\s*[{:]*\s*(.+?)(?:\n|$)/);
  if (returnMatch) return returnMatch[1].trim();
  
  // 否则取第一行非 @ 开头的描述
  const firstLine = jsdoc.split('\n')[0].replace(/^@/g, '').trim();
  if (firstLine) return firstLine;
  
  return jsdoc.slice(0, 200);
}

module.exports = { scanAllFiles, extractImports, extractExports, extractFunctions };
