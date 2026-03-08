import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ThreadsClient } from '../api/client.js';

const getRepliesSchema = z.object({
  thread_id: z.string().min(1, 'thread_id is required'),
  limit: z.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().optional(),
});

export const getRepliesDefinition = {
  name: 'get_replies',
  description: 'Get replies to a specific thread. Supports pagination.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      thread_id: { type: 'string', description: 'The ID of the thread to get replies for.' },
      limit: { type: 'number', description: 'Number of replies to return (1-100, default 25).' },
      cursor: { type: 'string', description: 'Pagination cursor from a previous response.' },
    },
    required: ['thread_id'],
  },
};

export async function handleGetReplies(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = getRepliesSchema.parse(args);
    const result = await client.getReplies(parsed.thread_id, {
      limit: parsed.limit,
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
      `Failed to get replies: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
