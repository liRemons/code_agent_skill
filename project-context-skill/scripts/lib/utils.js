/**
 * 通用工具函数模块
 * 提供文件读取、哈希计算等基础功能
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 扫描时忽略的目录列表
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', 'tmp', '.tmp', '.vscode', '.idea', '__pycache__', '.DS_Store', 'logs', '.context'];

// 需要分析的代码文件扩展名集合
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.py', '.java', '.go', '.rs', '.css', '.less', '.scss', '.sass', '.html', '.ejs']);

/**
 * 计算内容的 MD5 哈希值
 * @param {string} content - 需要计算哈希的内容
 * @returns {string} MD5 哈希字符串
 */
function md5(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * 读取并解析 JSON 文件
 * @param {string} filePath - 文件绝对路径
 * @returns {object|null} 解析后的对象，文件不存在或解析失败返回 null
 */
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * 读取文本文件内容
 * @param {string} filePath - 文件绝对路径
 * @returns {string|null} 文件内容，文件不存在或读取失败返回 null
 */
function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

module.exports = { IGNORE_DIRS, CODE_EXTENSIONS, md5, readJsonFile, readTextFile, path };
