import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createResume, getResume, listResumes, listTemplates } from '../scripts/lib/mcp-resume.mjs';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-mcp-test-'));
process.env.RESUME_STUDIO_DATA_DIR = dataDir;

function sampleState(templateId) {
  const template = JSON.parse(fs.readFileSync(`templates/${templateId}.json`, 'utf8'));
  const state = {
    version: 1,
    language: 'zh',
    meta: { title: `${template.target.zh} ${template.salary} ${template.region}` },
    style: {
      fontCN: 'Arial Unicode MS',
      fontEN: 'Arial',
      bodySize: 10,
      titleSize: 22,
      lineHeight: 1.25,
      marginMm: 16,
      accent: '#111111',
    },
    profiles: {
      zh: {
        basics: {
          name: '测试用户',
          phone: '13800000000',
          email: 'demo@example.com',
          target: template.target.zh,
          salary: template.salary,
          links: '',
        },
        education: [],
        experience: [
          {
            id: 'e1',
            company: '示例公司',
            role: '运营实习',
            start: '2025-01',
            end: '2025-03',
            bullets: ['完成商品上架与竞品分析。'],
          },
        ],
        projects: [],
        skills: [{ id: 's1', label: '语言', text: '英语可用于工作沟通。' }],
      },
      en: {
        basics: {
          name: 'TEST USER',
          phone: '13800000000',
          email: 'demo@example.com',
          target: template.target.en,
          salary: template.salary,
          links: '',
        },
        education: [],
        experience: [
          {
            id: 'e1',
            company: 'Example Co',
            role: 'Operations Intern',
            start: '2025-01',
            end: '2025-03',
            bullets: ['Completed product listings and competitor analysis.'],
          },
        ],
        projects: [],
        skills: [{ id: 's1', label: 'Languages', text: 'English for workplace communication.' }],
      },
    },
  };
  return state;
}

test('templates and create/list/get work with the shared schema', () => {
  const templates = listTemplates();
  assert.equal(templates.length, 5);
  assert.ok(templates.some((template) => template.id === 'marketing-product'));
  const created = createResume({
    template_id: 'marketing-product',
    state: sampleState('marketing-product'),
  });
  assert.ok(fs.existsSync(created.file));
  assert.ok(fs.existsSync(created.importPath));
  assert.equal(created.title, '市场营销 / 产品运营 6–8K 深圳');
  const rows = listResumes();
  assert.ok(rows.some((row) => row.title === created.title));
  const state = getResume({ file: path.relative(dataDir, created.file) });
  assert.equal(state.profiles.zh.basics.name, '测试用户');
});

test('MCP stdio exposes tools and creates a resume', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['scripts/mcp-server.mjs'],
    env: { ...process.env, RESUME_STUDIO_DATA_DIR: dataDir },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'resume-studio-test', version: '0.1.0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);
    for (const name of [
      'list_templates',
      'get_template',
      'create_resume',
      'update_resume',
      'list_resumes',
      'get_resume',
      'get_instructions',
    ]) {
      assert.ok(names.includes(name), `missing MCP tool ${name}`);
    }
    const listed = await client.callTool({ name: 'list_templates', arguments: {} });
    const templates = JSON.parse(listed.content[0].text);
    assert.equal(templates.length, 5);

    const result = await client.callTool({
      name: 'create_resume',
      arguments: { template_id: 'content-operations', state: sampleState('content-operations') },
    });
    const created = JSON.parse(result.content[0].text);
    assert.ok(fs.existsSync(created.importPath));
    assert.ok(created.title.includes('内容运营'));
  } finally {
    await client.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
