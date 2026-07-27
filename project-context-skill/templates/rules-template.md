# 项目编码规范

## TypeScript/JavaScript
- 优先使用 TypeScript
- 启用 strict 模式
- 避免 any 类型
- 函数需要返回类型标注

## Git 提交
- 格式: type(scope): description
- types: feat|fix|docs|style|refactor|test|chore
- 示例: feat(auth): add login validation

## 错误处理
- API 调用必须 try-catch
- 自定义错误类继承 Error
- 错误日志包含上下文信息

## 测试要求
- 新代码需要单元测试
- 覆盖率目标: 关键模块 >80%
- 测试命名: describe('模块') > it('场景')

## 代码组织
- 文件按功能模块划分
- 公共组件放 shared/common
- 工具函数放 utils/helpers
- 类型定义放 types/interfaces

## 安全规范
- 不硬编码敏感信息
- 验证用户输入
- 使用参数化查询
- 敏感操作记录审计日志