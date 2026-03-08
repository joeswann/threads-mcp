import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ThreadsClient } from '../api/client.js';

// list_threads

const listThreadsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(25),
  since: z.string().optional(),
  until: z.string().optional(),
  cursor: z.string().optional(),
});

export const listThreadsDefinition = {
  name: 'list_threads',
  description: 'List your own Threads posts. Supports pagination and date filtering.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: { type: 'number', description: 'Number of threads to return (1-100, default 25)' },
      since: { type: 'string', description: 'ISO date string. Only return threads created after this date.' },
      until: { type: 'string', description: 'ISO date string. Only return threads created before this date.' },
      cursor: { type: 'string', description: 'Pagination cursor from a previous response.' },
    },
    required: [],
  },
};

export async function handleListThreads(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = listThreadsSchema.parse(args);
    const result = await client.listThreads({
      limit: parsed.limit,
      since: parsed.since,
      until: parsed.until,
      after: parsed.cursor,
    });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list threads: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// get_thread

const getThreadSchema = z.object({
  thread_id: z.string().min(1, 'thread_id is required'),
});

export const getThreadDefinition = {
  name: 'get_thread',
  description: 'Get full details of a specific thread by its ID.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      thread_id: { type: 'string', description: 'The ID of the thread to retrieve.' },
    },
    required: ['thread_id'],
  },
};

export async function handleGetThread(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = getThreadSchema.parse(args);
    const result = await client.getThread(parsed.thread_id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get thread: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// delete_thread

const deleteThreadSchema = z.object({
  thread_id: z.string().min(1, 'thread_id is required'),
});

export const deleteThreadDefinition = {
  name: 'delete_thread',
  description: 'Permanently delete a thread. This action cannot be undone.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      thread_id: { type: 'string', description: 'The ID of the thread to delete.' },
    },
    required: ['thread_id'],
  },
};

export async function handleDeleteThread(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = deleteThreadSchema.parse(args);
    const result = await client.deleteThread(parsed.thread_id);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to delete thread: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
