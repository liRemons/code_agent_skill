/**
 * Prompt 生成模块
 * 从 .context/ 目录下的文档组装结构化的项目上下文 Prompt
 * 用于 LLM 对话时的上下文注入
 */

const { path, readTextFile } = require('./utils');

/**
 * 生成项目上下文 Prompt
 * @param {string} contextDir - .context/ 目录路径
 * @param {object} options - 生成选项
 * @param {boolean} options.includeStructure - 是否包含目录结构
 * @param {boolean} options.includeConfig - 是否包含配置信息
 * @param {boolean} options.includeModules - 是否包含模块信息
 * @param {boolean} options.includeCodeStyle - 是否包含代码风格
 * @param {boolean} options.includeDependencies - 是否包含依赖关系
 * @param {string} options.targetLanguage - 目标语言（zh/en）
 * @returns {string} 完整的 Prompt 文本
 */
function generatePrompt(contextDir, options = {}) {
  const {
    includeStructure = true,
    includeConfig = true,
    includeModules = true,
    includeCodeStyle = true,
    includeDependencies = false,
    targetLanguage = 'zh'
  } = options;

  const prompts = {
    zh: {
      header: '# 项目上下文\n\n',
      instructions: '你是一个专业的编程助手，请参考以下项目上下文信息来完成任务。\n\n'
    },
    en: {
      header: '# Project Context\n\n',
      instructions: 'You are a professional coding assistant. Please refer to the following project context to complete the task.\n\n'
    }
  };

  const p = prompts[targetLanguage] || prompts.zh;
  let result = p.header + p.instructions;

  if (includeConfig) {
    const configContent = readTextFile(path.join(contextDir, 'config.md'));
    if (configContent) result += `---\n\n${configContent}\n\n`;
  }

  if (includeModules) {
    const modulesContent = readTextFile(path.join(contextDir, 'modules.md'));
    if (modulesContent) {
      const treeMatch = modulesContent.match(/(```.*?```)/s);
      if (treeMatch) result += `---\n\n## 目录结构\n\n${treeMatch[0]}\n\n`;
      const publicSectionMatch = modulesContent.match(/(## 公共组件[^\n]*(?:.|\n)*?)(?=## |$)/s);
      if (publicSectionMatch) result += `---\n\n${publicSectionMatch[1]}\n\n`;
      const hooksMatch = modulesContent.match(/(## 公共 Hooks[^\n]*(?:.|\n)*?)(?=## |$)/s);
      if (hooksMatch) result += `${hooksMatch[1]}\n\n`;
      const utilsMatch = modulesContent.match(/(## 公共工具[^\n]*(?:.|\n)*?)(?=## |$)/s);
      if (utilsMatch) result += `${utilsMatch[1]}\n\n`;
    }
  }

  if (includeCodeStyle) {
    const codeStyleContent = readTextFile(path.join(contextDir, 'code-style.md'));
    if (codeStyleContent) result += `---\n\n${codeStyleContent}\n\n`;
  }

  const rulesContent = readTextFile(path.join(contextDir, 'rules.md'));
  if (rulesContent) result += `---\n\n${rulesContent}\n\n`;

  const memoryContent = readTextFile(path.join(contextDir, 'memory.md'));
  if (memoryContent) result += `---\n\n${memoryContent}\n\n`;

  if (includeDependencies) {
    const depsContent = readTextFile(path.join(contextDir, 'dependencies.json'));
    if (depsContent) result += `---\n\n## 依赖关系\n\n\`\`\`json\n${depsContent}\n\`\`\`\n\n`;
  }

  return result.trim();
}

module.exports = { generatePrompt };
