import type { Config } from '../config/index.js';
import type {
  ThreadsProfile,
  ThreadsPost,
  ThreadsInsight,
  ThreadsPaginatedResponse,
  ThreadsContainerResponse,
  ThreadsPublishResponse,
  ThreadsDeleteResponse,
} from './types.js';

const PROFILE_FIELDS = 'id,username,name,threads_profile_picture_url,threads_biography';
const THREAD_FIELDS = 'id,text,username,permalink,timestamp,media_type,media_url,shortcode,is_quote_post,has_replies';

export class ThreadsClient {
  private baseUrl: string;
  private accessToken: string;
  private userId: string;

  constructor(config: Config) {
    this.baseUrl = config.THREADS_API_BASE_URL;
    this.accessToken = config.THREADS_ACCESS_TOKEN;
    this.userId = config.THREADS_USER_ID;
  }

  private async makeRequest<T>(path: string, options: RequestInit & { params?: Record<string, string> } = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('access_token', this.accessToken);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `Threads API error ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.error?.message) {
          message = `Threads API error ${response.status}: ${parsed.error.message}`;
        }
      } catch {
        if (errorBody) message += ` - ${errorBody}`;
      }
      throw new Error(message);
    }

    return response.json() as Promise<T>;
  }

  async getProfile(fields?: string): Promise<ThreadsProfile> {
    return this.makeRequest<ThreadsProfile>(`/${this.userId}`, {
      params: { fields: fields || PROFILE_FIELDS },
    });
  }

  async listThreads(params: {
    limit?: number;
    since?: string;
    until?: string;
    after?: string;
    before?: string;
  } = {}): Promise<ThreadsPaginatedResponse<ThreadsPost>> {
    const queryParams: Record<string, string> = {
      fields: THREAD_FIELDS,
    };
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.since) queryParams.since = params.since;
    if (params.until) queryParams.until = params.until;
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    return this.makeRequest<ThreadsPaginatedResponse<ThreadsPost>>(`/${this.userId}/threads`, {
      params: queryParams,
    });
  }

  async getThread(threadId: string): Promise<ThreadsPost> {
    return this.makeRequest<ThreadsPost>(`/${threadId}`, {
      params: { fields: THREAD_FIELDS },
    });
  }

  async getReplies(threadId: string, params: {
    limit?: number;
    after?: string;
    before?: string;
  } = {}): Promise<ThreadsPaginatedResponse<ThreadsPost>> {
    const queryParams: Record<string, string> = {
      fields: THREAD_FIELDS,
    };
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    return this.makeRequest<ThreadsPaginatedResponse<ThreadsPost>>(`/${threadId}/replies`, {
      params: queryParams,
    });
  }

  async createContainer(params: {
    text: string;
    replyToId?: string;
    scheduledPublishTime?: number;
  }): Promise<ThreadsContainerResponse> {
    const body = new URLSearchParams();
    body.set('media_type', 'TEXT');
    body.set('text', params.text);
    if (params.replyToId) {
      body.set('reply_to_id', params.replyToId);
    }
    if (params.scheduledPublishTime) {
      body.set('publish_mode', 'SCHEDULED');
      body.set('scheduled_publish_time', String(params.scheduledPublishTime));
    }

    return this.makeRequest<ThreadsContainerResponse>(`/${this.userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  async publishContainer(creationId: string): Promise<ThreadsPublishResponse> {
    const body = new URLSearchParams();
    body.set('creation_id', creationId);

    return this.makeRequest<ThreadsPublishResponse>(`/${this.userId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  async deleteThread(threadId: string): Promise<ThreadsDeleteResponse> {
    return this.makeRequest<ThreadsDeleteResponse>(`/${threadId}`, {
      method: 'DELETE',
    });
  }

  async getThreadInsights(threadId: string, metrics?: string): Promise<ThreadsPaginatedResponse<ThreadsInsight>> {
    return this.makeRequest<ThreadsPaginatedResponse<ThreadsInsight>>(`/${threadId}/insights`, {
      params: {
        metric: metrics || 'views,likes,replies,reposts,quotes',
      },
    });
  }

  async getAccountInsights(params: {
    metric: string;
    since?: number;
    until?: number;
  }): Promise<ThreadsPaginatedResponse<ThreadsInsight>> {
    const queryParams: Record<string, string> = {
      metric: params.metric,
    };
    if (params.since) queryParams.since = String(params.since);
    if (params.until) queryParams.until = String(params.until);

    return this.makeRequest<ThreadsPaginatedResponse<ThreadsInsight>>(`/${this.userId}/threads_insights`, {
      params: queryParams,
    });
  }
}
