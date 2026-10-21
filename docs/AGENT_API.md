# 本地 Agent API / CLI

给本地 Codex、Claude、DeepSeek 或脚本使用的接口。默认只监听 `127.0.0.1`，没有鉴权，**不要暴露到公网**。

## 两种方式

### 1. CLI（推荐，最简单）

```bash
# 当前底稿（可先用应用导出 JSON 覆盖 private/resume.json）
node scripts/agent.mjs export --out private/agent/current.json

# 从聊天记录生成提示词
node scripts/agent.mjs prompt --history private/chat.md

# 校验 Agent 输出的完整 state JSON
node scripts/agent.mjs validate private/agent/candidate.json

# 备份旧底稿 + 写入可导入文件
node scripts/agent.mjs apply private/agent/candidate.json
```

`apply` 输出：

- `private/resume.json` — 新的本地底稿
- `private/backups/<timestamp>.json` — 旧底稿备份
- `private/agent/resume-import.json` — 在页面「导入简历」里选择它

### 2. HTTP API

```bash
node scripts/agent-server.mjs
# http://127.0.0.1:4178
```

| Method | Path          | 说明                                                        |
| ------ | ------------- | ----------------------------------------------------------- |
| GET    | `/api/health` | 健康检查                                                    |
| GET    | `/api/resume` | 读取 `private/resume.json`                                  |
| POST   | `/api/resume` | 提交完整 state（或 `{ "state": ... }`），校验 + 备份 + 写入 |

```bash
curl http://127.0.0.1:4178/api/health
curl http://127.0.0.1:4178/api/resume

curl -X POST http://127.0.0.1:4178/api/resume \
  -H 'Content-Type: application/json' \
  --data @private/agent/candidate.json
# => { ok: true, importPath: ".../resume-import.json", backup: "...", warnings: [] }
```

POST 成功后，在 **4173** 的应用里「导入简历」选择返回的 `importPath`。API 不会直接写浏览器 `localStorage`。

## 安全边界

- 只监听 `127.0.0.1`，并校验 `Host` 为 `127.0.0.1`/`localhost`
- POST 只接受 `Content-Type: application/json`；跨站 `text/plain` 请求返回 415
- 带 `Origin` 时只允许本机源；其他 Origin 返回 403
- 可选 `AGENT_TOKEN`：设置后请求需带 `x-agent-token` 头
- 写入使用临时文件 + rename，备份最多保留 50 份

```bash
AGENT_TOKEN=local-secret node scripts/agent-server.mjs
curl -X POST ... -H 'x-agent-token: local-secret' ...
```

## 数据要求

- 必须是完整的 schema v1：`profiles.zh` 和 `profiles.en` 都要有
- 只提交有事实依据的内容；不允许编造经历/数字/证书
- 项目按结束时间倒序，没有日期的放最后
- 长度和字段会被 `scripts/lib/resume-schema.mjs` 校验/截断
- Agent 没有查到的事实就省略

## 建议的 Agent 流程

1. `prompt` 生成的 `private/agent/prompt.md` 包含当前简历 + 聊天记录 + 规则
2. 让本地 Agent 只输出 JSON，不要 Markdown
3. `validate` / `apply`
4. 人工核对预览与事实
5. 导入前应用会自动备份

不要把 API 端口转发到公网；不要在 API 里放真实 Cookie 或密钥。
