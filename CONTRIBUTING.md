# Contributing

欢迎提交 issue / PR。

## 开发

```bash
npm install
npm run dev
# http://127.0.0.1:4173
```

要求 Node.js 20+。

## 提交前

```bash
npm run check
npm run build
npm test   # 需要本机 Chrome；可用 CHROME_PATH 指定
```

手工验收：

- 中文仍为一页 A4
- 我的简历：点卡片只预览，点「修改」才编辑
- 顶部标题跟随当前简历
- 照片上传后所有简历都有照片
- Word（与预览一致）/PDF/PNG 文件名使用简历名称，且与预览一致

## 约定

- 不提交 `private/`、真实简历、照片、cookie 或研究数据
- 不编造简历事实、数字、工具或奖项
- 不修改 `resume-studio.v1*` 存储键；需要迁移时加一次性迁移标记
- 保持纯静态、本地优先；新增联网能力需明确说明并默认关闭
- 行为变化请更新 `CHANGELOG.md` 和相关 `docs/`

## PR

- 说明改了什么、为什么
- 附截图或测试结果
- 避免把格式化/无关改动混在一起
