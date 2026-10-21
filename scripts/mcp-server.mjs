#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  createResume,
  getResume,
  getTemplate,
  instructionsText,
  listResumes,
  listTemplates,
  updateResume,
} from './lib/mcp-resume.mjs';

const server = new McpServer(
  { name: 'resume-studio', version: '0.2.0' },
  { instructions: instructionsText() },
);

function text(value) {
  return {
    content: [
      {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function failure(error) {
  return {
    isError: true,
    content: [{ type: 'text', text: error?.message || String(error) }],
  };
}

server.registerTool(
  'list_templates',
  {
    title: 'List resume templates',
    description:
      'List built-in resume templates (role, region, salary, guidance). Call this first when the user wants a new resume.',
    inputSchema: {},
  },
  async () => {
    try {
      return text(listTemplates());
    } catch (error) {
      return failure(error);
    }
  },
);

server.registerTool(
  'get_template',
  {
    title: 'Get resume template',
    description:
      'Return a template plus a valid Resume Studio v1 skeleton. Fill the skeleton with facts from the user/chat history; do not invent experience.',
    inputSchema: { template_id: z.string().describe('Template id from list_templates') },
  },
  async ({ template_id }) => {
    try {
      return text(getTemplate(template_id));
    } catch (error) {
      return failure(error);
    }
  },
);

server.registerTool(
  'create_resume',
  {
    title: 'Create a resume version',
    description:
      'Create a new resume JSON from a template and a complete Resume Studio v1 state. Writes an importable JSON for the app and returns importPath. Only use real facts.',
    inputSchema: {
      template_id: z.string().optional().describe('Template id; optional but recommended'),
      state: z
        .record(z.string(), z.unknown())
        .describe('Complete v1 state (profiles.zh and profiles.en)'),
    },
  },
  async ({ template_id, state }) => {
    try {
      return text(createResume({ template_id, state }));
    } catch (error) {
      return failure(error);
    }
  },
);

server.registerTool(
  'update_resume',
  {
    title: 'Update the current resume',
    description:
      'Replace the current local master resume with a complete v1 state, creating a backup and an importable JSON.',
    inputSchema: {
      state: z.record(z.string(), z.unknown()).describe('Complete v1 state'),
    },
  },
  async ({ state }) => {
    try {
      return text(updateResume({ state }));
    } catch (error) {
      return failure(error);
    }
  },
);

server.registerTool(
  'list_resumes',
  {
    title: 'List local resumes',
    description: 'List local resume files created by this MCP server and the current master.',
    inputSchema: {},
  },
  async () => {
    try {
      return text(listResumes());
    } catch (error) {
      return failure(error);
    }
  },
);

server.registerTool(
  'get_resume',
  {
    title: 'Read a local resume',
    description: 'Read a resume by the file path returned from list_resumes.',
    inputSchema: { file: z.string().describe('Relative file path from list_resumes') },
  },
  async ({ file }) => {
    try {
      return text(getResume({ file }));
    } catch (error) {
      return failure(error);
    }
  },
);

server.registerTool(
  'get_instructions',
  {
    title: 'Get resume-writing instructions',
    description: 'Return the fact-only resume-writing rules and MCP workflow.',
    inputSchema: {},
  },
  async () => text(instructionsText()),
);

await server.connect(new StdioServerTransport());
console.error('Resume Studio MCP server ready (stdio)');
