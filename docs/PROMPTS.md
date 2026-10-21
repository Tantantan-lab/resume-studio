# 修改指南：人改 / 提示词改

## 给 AI Agent 的总原则

1. 只基于已有简历和聊天记录里真实出现的事实；**不要编公司、职位、日期、数字、证书、技能**。
2. 中英文分开；不要自动翻译或覆盖另一种语言，除非明确要求。
3. 不改 localStorage 键名和 schema（`resume-studio.v1*`）。
4. 预览是视觉基准；导出必须跟随当前预览的简历。
5. 个人数据只放在 `private/`，不要提交。

## 用本地 Agent 根据聊天写简历

```bash
# 1. 当前底稿（应用内导出 JSON，或使用 private/ 里的文件）
node scripts/agent.mjs export --out private/agent/current.json

# 2. 把聊天记录整理成文本
node scripts/agent.mjs prompt --history private/chat.md --resume private/agent/current.json

# 3. 把 private/agent/prompt.md 发送给 Codex / Claude / DeepSeek
#    要求：只输出完整 candidate JSON，不要解释

# 4. 校验并生成导入文件
node scripts/agent.mjs apply private/agent/candidate.json

# 5. 应用「导入简历」选择 private/agent/resume-import.json
```

Agent 输出必须是完整 schema，而不是 diff。`apply` 会备份旧版本并做字段/长度校验。

## 常见修改提示词模板

### 加一个基本信息字段

> 在 `src/app.js` 的基本信息表单、`src/io.js` 的 `normalizeProfile`/DOCX 导入导出、`src/demo/data.js` 中加入 `basics.<field>`。保持中英文独立；旧数据缺失时给空值；不要改动 localStorage 键名。更新 `docs/DATA_MODEL.md`，运行 `npm run check && npm run build`。

### 改样式但不改导出

> 只改 `src/styles.css`。确保 `.resume` 的 A4 尺寸与 `.resume` 内的字体/间距；PNG/PDF/图片版 Word 会自动沿用预览。不要改 DOM 结构。验证中文仍为一页。

### 增加一个导出格式

> 在 `src/app.js` 的 `#download-options` 菜单和下载 handler 中增加 `data-export="..."`；复用 `renderPreviewCanvas()`/`renderPreviewPages()` 保证视觉一致；文件名用 `state.meta.title`；更新 README/CHANGELOG。

### 让 Agent 直接写入简历

> 阅读 `scripts/agent.mjs` 和 `scripts/agent-server.mjs`。保持 `private/` 为唯一写入位置，保留备份；不要从 Agent 直接写浏览器 localStorage。输出 `private/agent/resume-import.json`。

### 新增简历库模板

> 在 `src/app.js` 的 `seedLibrary()` 中增加一个 `mk(...)` 条目（岗位、英文岗位、薪资），并保持标题为「岗位 薪资 地区」。不要影响已有用户的 library；只影响首次初始化。

## 人改流程

1. 读 `docs/ARCHITECTURE.md` 和 `AGENTS.md`
2. 改 `src/`
3. `npm run check`
4. `npm run build`
5. `npm test`
6. 手工验证：中文一页、预览/修改、标题、照片同步、下载

## 验收清单

- [ ] 中文预览仍为一页（A4）
- [ ] 点卡片只预览，点「修改」才进入编辑
- [ ] 顶部标题与当前预览简历一致
- [ ] Word/PDF/PNG 文件名使用当前简历名称
- [ ] 图片版 Word/PDF/PNG 与预览视觉一致
- [ ] 照片在切换简历后仍存在
- [ ] 没有新增未证实的事实
- [ ] 没有把 `private/` 内容提交
