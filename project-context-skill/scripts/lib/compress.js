/**
 * 对话压缩模块
 * 对长对话历史进行智能压缩，保留关键信息并生成摘要
 * 适用于：对话消息数超过阈值时的上下文压缩
 */

/**
 * 压缩对话历史
 * @param {Array} messages - 对话消息数组
 * @param {object} options - 压缩选项
 * @param {number} options.threshold - 触发压缩的消息数阈值（默认 50）
 * @param {number} options.keepRecent - 保留的最近消息数（默认 10）
 * @param {number} options.groupSize - 分组大小（默认 15）
 * @returns {object} 压缩结果，包含压缩后的消息数组和统计信息
 */
function compressConversation(messages, options = {}) {
  const {
    threshold = 50,
    keepRecent = 10,
    groupSize = 15
  } = options;

  if (!Array.isArray(messages) || messages.length <= threshold) {
    return { compressed: false, messages, stats: { original: 0, compressed: 0, saved: 0 } };
  }

  const keyPoints = extractKeyPoints(messages);
  const messagesToCompress = messages.slice(0, -keepRecent);
  const recentMessages = messages.slice(-keepRecent);
  const groups = groupMessages(messagesToCompress, groupSize);
  const summaries = groups.map(group => generateSummary(group));

  const keyFiles = [...new Set(keyPoints.map(kp => extractFiles(kp)).flat())];
  const errors = keyPoints.filter(msg => isErrorReport(msg));

  const summaryMessages = summaries.map((s, i) => ({
    role: 'system',
    content: `[会话摘要 #${i + 1}] 时段: ${s.period}\n${s.summary}\n涉及文件: ${s.keyFiles.join(', ') || '无'}`
  }));

  const keyPointMessages = keyPoints.map(kp => ({
    role: kp.role,
    content: `[关键信息] ${kp.content}`
  }));

  const errorMessages = errors.map(err => ({
    role: 'system',
    content: `[错误记录] ${err.content}`
  }));

  const compressedMessages = [
    ...summaryMessages,
    ...keyPointMessages,
    ...errorMessages,
    ...recentMessages
  ];

  return {
    compressed: true,
    messages: compressedMessages,
    stats: {
      original: messages.length,
      compressed: compressedMessages.length,
      saved: messages.length - compressedMessages.length,
      keyPoints: keyPoints.length,
      errors: errors.length,
      keyFiles: keyFiles
    }
  };
}

/**
 * 提取关键信息点（决策点、代码变更、错误报告、用户请求）
 * @param {Array} messages - 消息数组
 * @returns {Array} 关键消息数组
 */
function extractKeyPoints(messages) {
  return messages.filter(msg =>
    isDecisionPoint(msg) ||
    isCodeChange(msg) ||
    isErrorReport(msg) ||
    isUserRequest(msg)
  );
}

/**
 * 判断消息是否为决策点
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isDecisionPoint(message) {
  const keywords = ['决定', '选择', '采用', '方案', '确认', 'select', 'decide', 'confirm', 'scheme'];
  return keywords.some(kw => message.content && message.content.includes(kw));
}

/**
 * 判断消息是否包含代码变更操作
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isCodeChange(message) {
  return message.content && (
    message.content.includes('edit_file') ||
    message.content.includes('create_file') ||
    message.content.includes('delete_file') ||
    (message.content.includes('```') && message.content.includes('diff'))
  );
}

/**
 * 判断消息是否包含错误信息
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isErrorReport(message) {
  const keywords = ['error', 'Error', '错误', '失败', 'fail', 'Fail', '异常', 'Exception', 'throw'];
  return keywords.some(kw => message.content && message.content.includes(kw));
}

/**
 * 判断消息是否为用户请求
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isUserRequest(message) {
  return message.role === 'user' && message.content && message.content.length > 20;
}

/**
 * 从消息内容中提取文件路径
 * @param {object} message - 消息对象
 * @returns {Array} 文件路径数组（最多 20 个）
 */
function extractFiles(message) {
  const files = [];
  const pathRegex = /(?:^|[\s(])([\w\-\/]+?\.(?:js|jsx|ts|tsx|vue|py|go|rs|json|css|html|md|yaml|yml))/g;
  let match;
  while ((match = pathRegex.exec(message.content)) !== null) {
    files.push(match[1]);
  }
  return files.slice(0, 20);
}

/**
 * 将消息按固定大小分组
 * @param {Array} messages - 消息数组
 * @param {number} groupSize - 每组大小
 * @returns {Array} 消息分组数组
 */
function groupMessages(messages, groupSize) {
  const groups = [];
  for (let i = 0; i < messages.length; i += groupSize) {
    const group = messages.slice(i, i + groupSize);
    groups.push({
      startTime: group[0]?.timestamp || group[0]?.date || '',
      endTime: group[group.length - 1]?.timestamp || group[group.length - 1]?.date || '',
      messages: group
    });
  }
  return groups;
}

/**
 * 为消息组生成摘要
 * @param {object} group - 消息组对象
 * @returns {object} 摘要对象（包含时段、摘要文本、关键文件）
 */
function generateSummary(group) {
  const fileChanges = [];
  const decisions = [];
  const errors = [];

  group.messages.forEach(msg => {
    if (!msg.content) return;
    if (isCodeChange(msg)) {
      fileChanges.push(...extractFiles(msg));
    }
    if (isDecisionPoint(msg)) {
      const content = msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content;
      decisions.push(content);
    }
    if (isErrorReport(msg)) {
      const content = msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content;
      errors.push(content);
    }
  });

  let summary = '';
  if (decisions.length > 0) summary += `- 关键决策: ${decisions.join('; ')}\n`;
  if (fileChanges.length > 0) summary += `- 文件变更: ${[...new Set(fileChanges)].join(', ')}\n`;
  if (errors.length > 0) summary += `- 错误信息: ${errors.join('; ')}\n`;
  if (!summary) summary = `- 常规对话交互\n`;

  return {
    period: `${group.startTime} - ${group.endTime}`,
    summary: summary.trim(),
    keyFiles: [...new Set(fileChanges)]
  };
}

module.exports = {
  compressConversation, extractKeyPoints, isDecisionPoint, isCodeChange,
  isErrorReport, isUserRequest, extractFiles, groupMessages, generateSummary
};
