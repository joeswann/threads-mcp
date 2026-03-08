import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getConfig } from './config/index.js';
import { ThreadsClient } from './api/client.js';

import { getProfileDefinition, handleGetProfile } from './tools/profile.js';
import {
  listThreadsDefinition, handleListThreads,
  getThreadDefinition, handleGetThread,
  deleteThreadDefinition, handleDeleteThread,
} from './tools/threads.js';
import { getRepliesDefinition, handleGetReplies } from './tools/replies.js';
import {
  createThreadDefinition, handleCreateThread,
  scheduleThreadDefinition, handleScheduleThread,
  replyToThreadDefinition, handleReplyToThread,
} from './tools/publish.js';
import {
  getThreadInsightsDefinition, handleGetThreadInsights,
  getAccountInsightsDefinition, handleGetAccountInsights,
} from './tools/insights.js';

const toolDefinitions = [
  getProfileDefinition,
  listThreadsDefinition,
  getThreadDefinition,
  deleteThreadDefinition,
  getRepliesDefinition,
  createThreadDefinition,
  scheduleThreadDefinition,
  replyToThreadDefinition,
  getThreadInsightsDefinition,
  getAccountInsightsDefinition,
];

const toolHandlers: Record<string, (client: ThreadsClient, args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>> = {
  get_profile: handleGetProfile,
  list_threads: handleListThreads,
  get_thread: handleGetThread,
  delete_thread: handleDeleteThread,
  get_replies: handleGetReplies,
  create_thread: handleCreateThread,
  schedule_thread: handleScheduleThread,
  reply_to_thread: handleReplyToThread,
  get_thread_insights: handleGetThreadInsights,
  get_account_insights: handleGetAccountInsights,
};

export async function createServer() {
  const config = getConfig();
  const client = new ThreadsClient(config);

  const server = new Server(
    { name: 'threads-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers[name];

    if (!handler) {
      return {
        content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    return handler(client, (args ?? {}) as Record<string, unknown>);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
