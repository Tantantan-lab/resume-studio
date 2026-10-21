import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeState } from './resume-schema.mjs';
import { BASE_STYLE } from '../../src/lib/schema.js';

export function dataDir() {
  return path.resolve(process.env.RESUME_STUDIO_DATA_DIR || path.join(process.cwd(), 'private'));
}

function templatesDir() {
  return path.resolve(
    process.env.RESUME_STUDIO_TEMPLATES_DIR || path.join(process.cwd(), 'templates'),
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backup(file, label) {
  if (!fs.existsSync(file)) return null;
  const dest = path.join(dataDir(), 'backups', `${timestamp()}-${label}.json`);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
  return dest;
}

function slug(value) {
  const cleaned = String(value || 'resume')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'resume';
}

export function listTemplates() {
  const dir = templatesDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const template = readJson(path.join(dir, name));
      return {
        id: template.id,
        name: template.name,
        language: template.language,
        region: template.region,
        salary: template.salary,
        target: template.target,
        description: template.description,
        guidance: template.guidance,
        doNotClaim: template.doNotClaim,
      };
    });
}

export function getTemplate(templateId) {
  const template = listTemplates().find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown template: ${templateId}`);
  const full = readJson(path.join(templatesDir(), `${templateId}.json`));
  return { ...full, skeleton: skeletonFor(full) };
}

export function skeletonFor(template) {
  const region = template.region || '深圳';
  const salary = template.salary || '面议';
  const target = template.target || {};
  const current = (lang) => ({
    name: '',
    phone: '',
    email: '',
    target: target[lang] || '',
    salary,
    links: '',
  });
  return {
    version: 1,
    language: template.language === 'en' ? 'en' : 'zh',
    meta: { title: `${target.zh || '未命名岗位'} ${salary} ${region}` },
    style: { ...BASE_STYLE, bodySize: 10, lineHeight: 1.25 },
    profiles: {
      zh: { basics: current('zh'), education: [], experience: [], projects: [], skills: [] },
      en: { basics: current('en'), education: [], experience: [], projects: [], skills: [] },
    },
  };
}

function applyTemplateDefaults(state, template) {
  const next = structuredClone(state);
  if (template) {
    for (const lang of ['zh', 'en']) {
      const basics = next.profiles?.[lang]?.basics;
      if (!basics) continue;
      if (!basics.target) basics.target = template.target?.[lang] || '';
      if (!basics.salary) basics.salary = template.salary || '';
    }
    const current = next.profiles?.[next.language]?.basics;
    if (!next.meta?.title || ['我的海外运营简历', '我的简历', ''].includes(next.meta.title)) {
      next.meta = {
        ...next.meta,
        title: [
          current?.target || '未命名岗位',
          current?.salary || '面议',
          template.region || '深圳',
        ].join(' '),
      };
    }
  }
  return next;
}

export function createResume({ template_id, state }) {
  if (!state || typeof state !== 'object')
    throw new Error('state is required; call get_template first');
  const template = template_id ? getTemplate(template_id) : null;
  const warnings = [];
  const normalized = normalizeState(applyTemplateDefaults(state, template), warnings);
  if (!normalized.profiles.zh.experience.length && !normalized.profiles.zh.projects.length) {
    warnings.push('简历还没有实习/项目经历；请确认是否确实没有可写的事实。');
  }
  const dir = path.join(dataDir(), 'resumes');
  const file = path.join(
    dir,
    `${slug(normalized.meta.title)}-${crypto.randomUUID().slice(0, 8)}.json`,
  );
  const importFile = path.join(dataDir(), 'agent', 'resume-import.json');
  const importBackup = backup(importFile, 'import-before-create');
  writeJson(file, normalized);
  writeJson(importFile, normalized);
  return {
    file,
    importPath: importFile,
    title: normalized.meta.title,
    template: template?.id || null,
    warnings,
    importBackup,
  };
}

export function updateResume({ state }) {
  if (!state || typeof state !== 'object') throw new Error('state is required');
  const warnings = [];
  const normalized = normalizeState(state, warnings);
  const master = path.join(dataDir(), 'resume.json');
  const importFile = path.join(dataDir(), 'agent', 'resume-import.json');
  const masterBackup = backup(master, 'master-before-update');
  writeJson(master, normalized);
  writeJson(importFile, normalized);
  return {
    file: master,
    importPath: importFile,
    title: normalized.meta.title,
    warnings,
    masterBackup,
  };
}

export function listResumes() {
  const root = dataDir();
  const files = [];
  const master = path.join(root, 'resume.json');
  if (fs.existsSync(master)) files.push(master);
  const dir = path.join(root, 'resumes');
  if (fs.existsSync(dir)) {
    for (const name of fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .sort()) {
      files.push(path.join(dir, name));
    }
  }
  return files.map((file) => {
    const state = readJson(file);
    const basics = state.profiles?.[state.language]?.basics || {};
    return {
      file: path.relative(root, file),
      title: state.meta?.title || '未命名简历',
      language: state.language,
      target: basics.target || '',
      salary: basics.salary || '',
      updatedAt: fs.statSync(file).mtime.toISOString(),
    };
  });
}

export function getResume({ file }) {
  const root = dataDir();
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep) || !resolved.endsWith('.json')) {
    throw new Error('Invalid resume file');
  }
  if (!fs.existsSync(resolved)) throw new Error(`Resume not found: ${file}`);
  return readJson(resolved);
}

export function instructionsText() {
  return `# Resume Studio MCP

Use these tools to write a resume from real facts, with a role template and the app's schema.

## Workflow

1. Call list_templates.
2. Call get_template for the matching role (marketing-product, cross-border-ecommerce, content-operations, product-operations, overseas-marketing-en).
3. Ask for or use the user's chat history/current resume. Only use facts that are explicitly present.
4. Build a complete Resume Studio v1 state from the template skeleton and call create_resume.
5. Tell the user to import the returned importPath in the app ("导入简历"). For updating the current resume, call update_resume.

## Rules

- Never invent companies, dates, metrics, certificates, tools, awards or language scores.
- Do not add paid media, SEO/SEM, ACoS, FBA, account-growth or sales quotas unless the user provided evidence.
- Keep Chinese and English profiles independent; do not machine-translate unsupported claims.
- Projects are sorted by end date descending; undated last.
- Image-based Word/PDF are visual-only; editable Word is approximate; never claim text-layer PDF without checking.
- Templates are skeletons, not content. Fill them only with the user's facts.
`;
}
