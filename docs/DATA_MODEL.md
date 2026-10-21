# Data model

## Resume state (schema v1)

```json
{
  "version": 1,
  "language": "zh",
  "meta": { "title": "市场营销 / 产品运营 8–10K 杭州" },
  "style": {
    "fontCN": "Arial Unicode MS",
    "fontEN": "Arial",
    "bodySize": 10,
    "titleSize": 22,
    "lineHeight": 1.25,
    "marginMm": 16,
    "accent": "#111111"
  },
  "profiles": {
    "zh": {
      "basics": {
        "name": "陈知遥",
        "phone": "000-0000-0000",
        "email": "zhiyao.chen@example.com",
        "target": "市场营销 / 产品运营",
        "salary": "8–10K",
        "links": "虚构演示 · 经历与数据均为示例",
        "photo": "",
        "photoOriginal": "",
        "photoPosition": "center"
      },
      "education": [],
      "experience": [],
      "projects": [],
      "skills": []
    },
    "en": { }
  }
}
```

`profiles.zh` and `profiles.en` are independent. `salary` is displayed with `target` in the preview and exports.

## Library entry

```json
{
  "id": "uuid",
  "region": "杭州",
  "note": "",
  "createdAt": 0,
  "updatedAt": 0,
  "state": { /* full resume state */ }
}
```

The visible name comes from `state.meta.title`; seeded titles follow `岗位 + 薪资 + 地区`. `note` is appended for variants such as `当前版本` or `新版本`.

## Import rules (`src/io.js`)

- `version` must be `1`
- both `profiles.zh` and `profiles.en` are required
- allowlisted fields only; unknown keys are dropped
- arrays: max 60 entries/section, 40 bullets/experience
- text lengths are capped
- photo data URLs are validated by magic bytes and dimensions
- style numbers are clamped

DOCX import is a best-effort draft; always review the extracted text. JSON is the lossless format.

## Agent output

Agents must produce a complete v1 state (not a patch). `scripts/agent.mjs apply` validates the structure, rejects or trims unsafe fields, writes a timestamped backup, and creates `private/agent/resume-import.json` for the app's 导入简历 flow.
