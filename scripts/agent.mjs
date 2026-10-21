#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeState } from './lib/resume-schema.mjs';

const ROOT = process.cwd();
const priv = (...parts) => path.join(ROOT, 'private', ...parts);
const ensure = (file) => fs.mkdirSync(path.dirname(file), { recursive: true });
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    flags[key] = value;
  }
  return flags;
}

async function loadState(file) {
  if (file) {
    if (!fs.existsSync(file)) throw new Error(`找不到指定的简历文件: ${file}`);
    if (file.endsWith('.js') || file.endsWith('.mjs')) {
      const mod = await import(pathToFileURL(path.resolve(file)).href);
      return structuredClone(mod.defaultState || mod.state);
    }
    return readJson(file);
  }
  for (const candidate of [
    priv('resume.json'),
    priv('data.personal.js'),
    path.join(ROOT, 'src', 'demo', 'data.js'),
  ]) {
    if (!fs.existsSync(candidate)) continue;
    if (candidate.endsWith('.js')) {
      const mod = await import(pathToFileURL(candidate).href);
      return structuredClone(mod.defaultState || mod.state);
    }
    return readJson(candidate);
  }
  throw new Error('没有找到底稿。请先在应用里导出 JSON 到 private/resume.json。');
}

function writeState(file, state) {
  ensure(file);
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + '\n');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupMaster(file) {
  if (!fs.existsSync(file)) return null;
  const dest = priv('backups', `${timestamp()}.json`);
  ensure(dest);
  fs.copyFileSync(file, dest);
  return dest;
}

function printWarnings(warnings) {
  for (const warning of warnings) console.warn('warning:', warning);
}

function promptText(state, history) {
  return `# 本地简历生成任务

你是一个本地简历编辑 Agent。请根据「聊天记录」和「当前简历」，输出一份完整、可导入的简历 JSON。

## 硬性规则

- 只使用聊天记录或当前简历中明确出现的事实。不要编造公司、职位、日期、数字、证书、奖项、工具或语言成绩。
- 没有证据的经历不要写；不确定的内容省略。
- 中英文档案分开；只更新有依据的部分，不要自动翻译整份简历。
- 项目按结束时间倒序，没有日期的放最后。
- 输出必须符合 Resume Studio schema v1，包含完整的 profiles.zh 和 profiles.en。
- 只输出一个 JSON 对象，不要 Markdown 代码块、不要解释。
- meta.title 使用「岗位 + 薪资 + 地区」，例如「市场营销 / 产品运营 6–8K 深圳」。
- 不要写 ACoS、FBA、SEO/SEM、投放 ROI、账号增长等没有证据的能力。

## Schema 要点

\`\`\`json
{
  "version": 1,
  "language": "zh",
  "meta": { "title": "岗位 薪资 地区" },
  "style": { "fontCN": "Arial Unicode MS", "fontEN": "Arial", "bodySize": 10, "titleSize": 22, "lineHeight": 1.25, "marginMm": 16, "accent": "#111111" },
  "profiles": {
    "zh": { "basics": { "name": "", "phone": "", "email": "", "target": "", "salary": "", "links": "" }, "education": [], "experience": [], "projects": [], "skills": [] },
    "en": { "basics": {}, "education": [], "experience": [], "projects": [], "skills": [] }
  }
}
\`\`\`

## 当前简历

\`\`\`json
${JSON.stringify(state, null, 2)}
\`\`\`

## 聊天记录

${history}

## 输出

只输出完整 JSON。
`;
}

const [command, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);
const positional = rest.filter(
  (arg) => !arg.startsWith('--') && !Object.values(flags).includes(arg),
);

try {
  if (command === 'export') {
    const source = flags.resume || priv('resume.json');
    const state = await loadState(source);
    const out = flags.out || priv('agent', 'current.json');
    writeState(out, state);
    console.log(`exported -> ${out}`);
  } else if (command === 'prompt') {
    if (!flags.history) throw new Error('缺少 --history <聊天记录文件>');
    const history = fs.readFileSync(path.resolve(flags.history), 'utf8');
    const source = flags.resume || priv('agent', 'current.json');
    const state = await loadState(source);
    if (!fs.existsSync(priv('agent', 'current.json')))
      writeState(priv('agent', 'current.json'), state);
    const out = flags.out || priv('agent', 'prompt.md');
    ensure(out);
    fs.writeFileSync(out, promptText(state, history));
    console.log(`prompt -> ${out}`);
    console.log('把这个文件交给本地 Codex / Claude / DeepSeek，要求只输出 JSON。');
  } else if (command === 'validate') {
    const file = positional[0];
    if (!file) throw new Error('用法: node scripts/agent.mjs validate <candidate.json>');
    const raw = readJson(path.resolve(file));
    const warnings = [];
    const state = normalizeState(raw.state || raw, warnings);
    printWarnings(warnings);
    console.log(
      JSON.stringify(
        {
          title: state.meta.title,
          language: state.language,
          education: state.profiles.zh.education.length,
          experience: state.profiles.zh.experience.length,
          projects: state.profiles.zh.projects.map((p) => p.title),
        },
        null,
        2,
      ),
    );
  } else if (command === 'apply') {
    const file = positional[0];
    if (!file) throw new Error('用法: node scripts/agent.mjs apply <candidate.json>');
    const raw = readJson(path.resolve(file));
    const warnings = [];
    const state = normalizeState(raw.state || raw, warnings);
    const master = priv('resume.json');
    const backup = backupMaster(master);
    writeState(master, state);
    const importFile = flags.out || priv('agent', 'resume-import.json');
    writeState(importFile, state);
    printWarnings(warnings);
    console.log(`master   -> ${master}`);
    console.log(`backup   -> ${backup || '(none)'}`);
    console.log(`import   -> ${importFile}`);
    console.log('下一步：在应用里「导入简历」选择 import 文件（导入前会自动备份）。');
  } else {
    console.log(`Resume Studio local agent

用法:
  node scripts/agent.mjs export [--resume file] [--out file]
  node scripts/agent.mjs prompt --history chat.md [--resume file] [--out file]
  node scripts/agent.mjs validate candidate.json
  node scripts/agent.mjs apply candidate.json [--out file]

默认路径:
  private/resume.json                 当前底稿
  private/agent/current.json          导出底稿
  private/agent/prompt.md             Agent 提示词
  private/agent/resume-import.json    可导入文件
  private/backups/                    每次 apply 的备份
`);
  }
} catch (error) {
  console.error('error:', error.message || error);
  process.exit(1);
}
