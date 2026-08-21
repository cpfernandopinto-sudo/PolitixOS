-- Bloco 3B.2: relação aditiva e opcional entre comentários e replies.
alter table public.instagram_comments
  add column if not exists parent_comment_id uuid null;

create index if not exists idx_instagram_comments_parent_comment_id
  on public.instagram_comments (parent_comment_id)
  where parent_comment_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'instagram_comments_parent_comment_id_fkey'
      and conrelid = 'public.instagram_comments'::regclass
  ) then
    alter table public.instagram_comments
      add constraint instagram_comments_parent_comment_id_fkey
      foreign key (parent_comment_id)
      references public.instagram_comments(id)
      on delete set null
      not valid;
  end if;
end $$;

comment on column public.instagram_comments.parent_comment_id is
  'Bloco 3B.2: comentário pai quando a linha representa uma reply do Instagram.';
