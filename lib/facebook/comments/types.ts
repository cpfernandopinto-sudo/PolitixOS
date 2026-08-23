export type FacebookCommentContentType = 'TEXTUAL' | 'EMOJI_ONLY' | 'STICKER' | 'GIF' | 'IMAGE_ONLY' | 'EMPTY';

export interface FacebookProviderComment {
  type?: unknown; comment_id?: unknown; legacy_comment_id?: unknown; depth?: unknown;
  parent_comment_id?: unknown; created_time?: unknown; message?: unknown; author?: unknown;
  replies_count?: unknown; reactions_count?: unknown; expansion_token?: unknown;
  is_sticker?: unknown; sticker?: unknown; is_gif?: unknown; gif?: unknown;
  image?: unknown; video?: unknown; [key: string]: unknown;
}

export interface FacebookCommentsPage {
  comments: FacebookProviderComment[];
  cursor: string | null;
  raw: Record<string, unknown>;
}

export interface FacebookNormalizedComment {
  externalCommentId: string;
  legacyCommentId: string | null;
  externalPostId: string;
  parentCommentExternalId: string | null;
  depth: number;
  text: string | null;
  publishedAt: string | null;
  authorId: string | null;
  authorName: string | null;
  authorProfileUrl: string | null;
  authorProfileImage: string | null;
  reactionsCount: number | null;
  repliesCount: number | null;
  contentType: FacebookCommentContentType;
  rawJson: Record<string, unknown>;
}
