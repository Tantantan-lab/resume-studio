# 自定义

## 换成自己的简历数据

推荐方式：

1. 在应用里编辑/导入自己的简历
2. 「下载 → JSON」导出
3. 下次通过「导入简历」恢复

如果要做自己的默认数据：

```bash
cp src/demo/data.js private/my-data.js      # 参考结构
# 修改 src/demo/data.js 或从应用导出后替换
npm run build
```

**不要把真实姓名、电话、邮箱、公司、照片提交到公开仓库。** 开源仓库只保留 `src/demo/data.js` 的虚构演示数据。

## 修改品牌与配色

- 主色：`src/styles.css` 的 `:root { --primary: ... }`
- 品牌名：`src/index.html` 的 `.brand`
- favicon：`src/public/favicon.svg`
- 简历字体/字号/页边距：应用内「字体与排版」，或 `src/demo/data.js` 的 `style`

## 修改简历库预置版本

编辑 `src/lib/store.js` 的 `seedLibrary()`：

```js
mk('市场营销 / 产品运营', 'Marketing / Product Operations', '6–8K')
```

参数依次是中文岗位、英文岗位、薪资。名称会自动变成「岗位 薪资 深圳」。首次打开（或清除站点数据后）才会重新生成；已有简历库不会被覆盖。

## 修改默认城市

搜索 `深圳`，涉及 `seedLibrary()`、`autoResumeName()` 和 `resumeName()` 的默认区域。改成你的目标城市即可。

## 修改导出

- 图片/PDF/图片版 Word 都来自 `renderPreviewCanvas()`；改预览 CSS 就会同步改它们
- 可编辑 Word 在 `src/io.js` 的 `exportDocx()`
- 文件名在 `src/io.js` 的 `safeFilename()`，基于 `state.meta.title`

## 运行与构建

```bash
npm run dev      # Vite dev server，4173
npm run build    # vite build -> dist（带 hash）
npm run preview  # dist，4173
```
