# 部署

这是纯静态站点，构建后把 `dist/` 放到任意静态托管即可。

## GitHub Pages

仓库已包含 `.github/workflows/pages.yml`：

1. 把项目推到 GitHub 的 `main` 分支
2. 仓库 Settings → Pages → Source 选择 GitHub Actions
3. 推送后自动构建并发布 `dist/`

## Netlify / Vercel / Cloudflare Pages

- Build command: `npm run build`
- Output directory: `dist`
- 不需要环境变量或服务端函数

## 本地预览

```bash
npm run build
npm run preview
# http://127.0.0.1:4173
```

指定本机端口：

```bash
npm run preview -- --port 4180
# http://127.0.0.1:4180
```

服务只绑定 127.0.0.1，不向局域网开放。端口冲突会给出替代端口建议。

## 代码检查

```bash
npm run format:check
npm run check
npm run test:unit
npm test
```

`npm run verify` 可顺序执行上述流程。Prettier 版本锁定在 devDependencies，忽略第三方 vendor、个人材料 private 和构建目录 dist。

## 注意事项

- `localStorage` 按域名/端口隔离：从本机迁到公网域名后，需要重新导入 JSON
- 图片版 Word/PDF 与预览一致，但文字不可编辑；可编辑 Word 排版近似
- 公开部署时请使用演示数据，或让用户自行导入；不要把 `private/` 提交
- 如果使用 CDN，建议对 `index.html` 不缓存，或使用带 hash 的构建文件名；当前构建是简单静态复制
