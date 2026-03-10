import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ThreadsClient } from '../api/client.js';

export const getProfileDefinition = {
  name: 'get_profile',
  description: 'Get the authenticated Threads user profile including username, name, bio, follower count, and verification status.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function handleGetProfile(client: ThreadsClient, _args: Record<string, unknown>) {
  try {
    const profile = await client.getProfile();
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(profile, null, 2),
      }],
    };
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to get profile: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
