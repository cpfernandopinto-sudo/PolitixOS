alter table public.instagram_comments
  drop constraint if exists instagram_comments_parent_comment_id_fkey;

drop index if exists public.idx_instagram_comments_parent_comment_id;

alter table public.instagram_comments
  drop column if exists parent_comment_id;
