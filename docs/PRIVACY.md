# 隐私与安全

## 数据在哪里

- 简历内容、照片、版本记录：浏览器 `localStorage`
- 导入的文件：只在浏览器内解析
- 导出的 Word/PDF/PNG/JSON：下载到本机
- 应用不包含账号、埋点、上传接口或第三方分析脚本

清除浏览器站点数据会删除简历；请定期导出 JSON 备份。

GitHub Pages 的 `<user>.github.io` 项目站点共享同一 origin，localStorage 会与同账号其他 Pages 项目共用；公开演示只应使用虚构数据，真实简历建议只在本地或专用域名使用。

## 公开仓库

`src/demo/data.js` 是虚构演示数据。真实简历、联系方式、照片和求职记录应放在 `private/`（已在 `.gitignore` 中忽略），不要提交。

## 本地 Agent

`scripts/agent.mjs` 与 `scripts/agent-server.mjs` 只读写本机 `private/` 文件。Agent 的模型调用由你本地的 Codex / Claude / DeepSeek 完成，仓库本身不配置 API Key，也不上传简历。

把聊天记录交给模型前，请自行确认其中是否包含不希望发送的内容。

## 第三方组件

- `docx.js`、`JSZip`、`pdf-lib` 以本地 vendor 文件形式加载
- 字体使用系统字体；不请求外部字体
- 岗位词库来自公开招聘摘录，仅作措辞参考，不代表用户具备相应能力

## 已知限制

- 图片版 Word/PDF 文字不可检索/编辑
- 可编辑 Word 的排版由 docx.js 生成，无法与浏览器预览像素级一致
- `localStorage` 容量约 5 MB；多份简历同步照片会占用空间
