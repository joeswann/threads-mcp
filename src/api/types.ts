export type ThreadsProfile = {
  id: string;
  username: string;
  name: string;
  threads_profile_picture_url: string;
  threads_biography: string;
  followers_count?: number;
};

export type ThreadsPost = {
  id: string;
  text?: string;
  username?: string;
  permalink?: string;
  timestamp?: string;
  media_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media_url?: string;
  shortcode?: string;
  is_quote_post?: boolean;
  has_replies?: boolean;
};

export type ThreadsInsight = {
  name: string;
  title: string;
  description: string;
  period: string;
  values: Array<{ value: number; end_time?: string }>;
  id: string;
};

export type ThreadsPaginatedResponse<T> = {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
};

export type ThreadsContainerResponse = {
  id: string;
};

export type ThreadsPublishResponse = {
  id: string;
};

export type ThreadsDeleteResponse = {
  success: boolean;
};
