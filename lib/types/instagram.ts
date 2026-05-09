export interface InstagramPost {
  id: string;
  text: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  url: string;
  sentiment: string;
  risk: string;
  topics: string[];
  topic: string;
  riskReason: string;
  summary: string;
  recommendedAction: string;
  image_url?: string | null;
}

export interface InstagramComment {
  id: string;
  text: string;
  created_at: string;
  like_count: number;
  post_id: string;
  post_url: string;
  post_caption: string;
}
