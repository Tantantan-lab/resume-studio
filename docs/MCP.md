# MCP Server：让 AI 发现并创建简历

Resume Studio 提供一个本地 **stdio MCP Server**。Codex / Claude Code 等支持 MCP 的客户端可以自动发现 `list_templates`、`create_resume` 等工具，不需要人工复制提示词。

## 启动

```bash
npm install
npm run mcp
```

`npm run mcp` 启动 stdio 服务，正常使用时由 MCP 客户端拉起，不需要手动运行。

### Claude Code

仓库根目录已包含 `.mcp.json`：

```json
{
  "mcpServers": {
    "resume-studio": {
      "command": "node",
      "args": ["scripts/mcp-server.mjs"]
    }
  }
}
```

打开项目后按 Claude Code 提示批准该 MCP Server，或用 `/mcp` 查看工具。

### Codex / 其他 MCP 客户端

在客户端的 MCP 配置中加入：

```json
{
  "command": "node",
  "args": ["scripts/mcp-server.mjs"],
  "cwd": "/path/to/resume-studio"
}
```

Codex 也可以使用：

```bash
codex mcp add resume-studio -- node scripts/mcp-server.mjs
```

## 工具

| 工具               | 作用                                                   |
| ------------------ | ------------------------------------------------------ |
| `list_templates`   | 列出岗位模板（岗位、地区、薪资、写作提示、禁止宣称项） |
| `get_template`     | 返回模板 + 完整 schema v1 骨架                         |
| `create_resume`    | 用模板 + 完整 state 创建新简历，写出可导入 JSON        |
| `update_resume`    | 用完整 state 更新当前主简历（自动备份）                |
| `list_resumes`     | 列出 `private/` 下已有的简历文件                       |
| `get_resume`       | 读取某个简历文件                                       |
| `get_instructions` | 返回事实约束、schema 和推荐工作流                      |

## 模板

`templates/` 内置 5 个岗位模板：

- `marketing-product` 市场营销 / 产品运营
- `cross-border-ecommerce` 跨境电商运营
- `content-operations` 内容运营 / 内容营销
- `product-operations` 产品运营 / 产品助理
- `overseas-marketing-en` 英文海外市场营销

模板是**骨架 + 写作提示**，不包含虚构经历。AI 必须用用户聊天/现有简历里的事实填充。

## 推荐流程

1. 用户在 Claude Code / Codex 里说：「根据这些聊天记录，帮我写一份深圳市场营销简历」
2. AI 调 `list_templates` → `get_template`
3. AI 从聊天记录中提取真实事实，补全 `profiles.zh` / `profiles.en`
4. AI 调 `create_resume({ template_id, state })`
5. 工具返回 `importPath`（默认 `private/agent/resume-import.json`）
6. 在 4173 应用里点「导入简历」选择该文件

> 当前导入会更新**当前简历**。如果你想保留为新版本：先在「我的简历」点「新建简历」，再导入；或者让 AI 用 `update_resume` 明确更新当前版本。

## 数据与安全

- 只写本机 `private/`：`private/resumes/`、`private/agent/resume-import.json`、`private/backups/`
- 所有 state 经过 `src/lib/schema.js` 校验、截断和照片校验
- 工具说明和 `get_instructions` 明确要求：不编造公司、日期、数字、证书、工具、奖项或语言成绩
- 不配置 API Key；模型调用由本地客户端完成
- MCP Server 只监听 stdio，不开放网络端口

## 已知限制

- 图片版 Word/PDF 需要浏览器预览；MCP 只产出 JSON，最终导出在应用里完成
- `create_resume` 不会直接写浏览器 localStorage；需要导入 JSON
- 导入为新简历的“先新建再导入”步骤目前是手动的
