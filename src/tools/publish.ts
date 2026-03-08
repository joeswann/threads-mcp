import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ThreadsClient } from '../api/client.js';

// create_thread

const createThreadSchema = z.object({
  text: z.string().min(1).max(500, 'Thread text must be 500 characters or fewer'),
});

export const createThreadDefinition = {
  name: 'create_thread',
  description: 'Create and publish a new text thread. Uses the two-step flow: creates a media container, then publishes it. Returns the new thread ID and permalink.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: { type: 'string', description: 'The text content of the thread (max 500 characters).' },
    },
    required: ['text'],
  },
};

export async function handleCreateThread(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = createThreadSchema.parse(args);

    // Step 1: Create container
    const container = await client.createContainer({ text: parsed.text });

    // Step 2: Publish container
    const published = await client.publishContainer(container.id);

    // Step 3: Fetch the published thread for permalink
    const thread = await client.getThread(published.id);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          id: published.id,
          permalink: thread.permalink,
          text: thread.text,
          timestamp: thread.timestamp,
        }, null, 2),
      }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create thread: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// schedule_thread

const scheduleThreadSchema = z.object({
  text: z.string().min(1).max(500, 'Thread text must be 500 characters or fewer'),
  scheduled_time: z.string().min(1, 'scheduled_time is required (ISO 8601 datetime)'),
});

export const scheduleThreadDefinition = {
  name: 'schedule_thread',
  description: 'Schedule a text thread for future publishing. The scheduled time must be between 20 minutes and 75 days from now.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: { type: 'string', description: 'The text content of the thread (max 500 characters).' },
      scheduled_time: { type: 'string', description: 'ISO 8601 datetime for when to publish (e.g. "2025-12-25T09:00:00Z"). Must be 20 mins to 75 days in the future.' },
    },
    required: ['text', 'scheduled_time'],
  },
};

export async function handleScheduleThread(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = scheduleThreadSchema.parse(args);
    const scheduledTime = new Date(parsed.scheduled_time);

    if (isNaN(scheduledTime.getTime())) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid date format. Use ISO 8601 (e.g. "2025-12-25T09:00:00Z").');
    }

    const nowMs = Date.now();
    const minMs = nowMs + 20 * 60 * 1000;
    const maxMs = nowMs + 75 * 24 * 60 * 60 * 1000;

    if (scheduledTime.getTime() < minMs) {
      throw new McpError(ErrorCode.InvalidParams, 'Scheduled time must be at least 20 minutes in the future.');
    }
    if (scheduledTime.getTime() > maxMs) {
      throw new McpError(ErrorCode.InvalidParams, 'Scheduled time must be within 75 days.');
    }

    const unixTimestamp = Math.floor(scheduledTime.getTime() / 1000);

    // Step 1: Create container with scheduled publish
    const container = await client.createContainer({
      text: parsed.text,
      scheduledPublishTime: unixTimestamp,
    });

    // Step 2: Publish (registers the schedule)
    const published = await client.publishContainer(container.id);

    return {
      content: [{
        type: 'text' as const,
        text: `Thread scheduled successfully.\nID: ${published.id}\nScheduled for: ${scheduledTime.toISOString()}`,
      }],
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to schedule thread: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// reply_to_thread

const replyToThreadSchema = z.object({
  thread_id: z.string().min(1, 'thread_id is required'),
  text: z.string().min(1).max(500, 'Reply text must be 500 characters or fewer'),
});

export const replyToThreadDefinition = {
  name: 'reply_to_thread',
  description: 'Reply to an existing thread. Uses the two-step flow with reply_to_id: creates a media container as a reply, then publishes it.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      thread_id: { type: 'string', description: 'The ID of the thread to reply to.' },
      text: { type: 'string', description: 'The text content of the reply (max 500 characters).' },
    },
    required: ['thread_id', 'text'],
  },
};

export async function handleReplyToThread(client: ThreadsClient, args: Record<string, unknown>) {
  try {
    const parsed = replyToThreadSchema.parse(args);

    // Step 1: Create container with reply_to_id
    const container = await client.createContainer({
      text: parsed.text,
      replyToId: parsed.thread_id,
    });

    // Step 2: Publish container
    const published = await client.publishContainer(container.id);

    // Step 3: Fetch the published reply for permalink
    const thread = await client.getThread(published.id);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          id: published.id,
          permalink: thread.permalink,
          text: thread.text,
          timestamp: thread.timestamp,
          reply_to: parsed.thread_id,
        }, null, 2),
      }],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${error.message}`);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to reply to thread: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
