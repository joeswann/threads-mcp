import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ThreadsClient } from '../api/client.js';

// get_thread_insights

const getThreadInsightsSchema = z.object({
  thread_id: z.string().min(1, 'thread_id is required'),
  metrics: z.string().optional().default('views,likes,replies,reposts,quotes'),
});

export const getThreadInsightsDefinition = {
  name: 'get_thread_insights',
  description: 'Get engagement metrics for a specific thread (views, likes, replies, reposts, quotes).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      thread_id: { type: 'string', description: 'The ID of the thread to get insights for.' },
      metrics: { type: 'string', description: 'Comma-separated list of metrics. Defaults to "views,likes,replies,reposts,quotes".' },
    },
    required: ['thread_id'],
  },
};

export async function handleGetThreadInsights(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = getThreadInsightsSchema.parse(args);
    const result = await client.getThreadInsights(parsed.thread_id, parsed.metrics);
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
      `Failed to get thread insights: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// get_account_insights

const getAccountInsightsSchema = z.object({
  metric: z.string().min(1, 'metric is required'),
  since: z.string().optional(),
  until: z.string().optional(),
});

export const getAccountInsightsDefinition = {
  name: 'get_account_insights',
  description: 'Get account-level analytics. Metric options: views, likes, replies, reposts, quotes, followers_count, follower_demographics. Dates are converted to Unix timestamps for the API.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      metric: { type: 'string', description: 'Comma-separated list of metrics to retrieve.' },
      since: { type: 'string', description: 'ISO date string for the start of the period.' },
      until: { type: 'string', description: 'ISO date string for the end of the period.' },
    },
    required: ['metric'],
  },
};

export async function handleGetAccountInsights(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = getAccountInsightsSchema.parse(args);

    const params: { metric: string; since?: number; until?: number } = {
      metric: parsed.metric,
    };

    if (parsed.since) {
      const sinceDate = new Date(parsed.since);
      if (isNaN(sinceDate.getTime())) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid "since" date: ${parsed.since}`);
      }
      params.since = Math.floor(sinceDate.getTime() / 1000);
    }

    if (parsed.until) {
      const untilDate = new Date(parsed.until);
      if (isNaN(untilDate.getTime())) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid "until" date: ${parsed.until}`);
      }
      params.until = Math.floor(untilDate.getTime() / 1000);
    }

    const result = await client.getAccountInsights(params);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get account insights: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
