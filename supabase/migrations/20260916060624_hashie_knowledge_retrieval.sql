-- Reviewed Hashie learning content for server-only retrieval.
-- The mobile client ships its own offline read-only copy. This table is only
-- for backend agent context and is not exposed to client roles.

create extension if not exists vector with schema extensions;

create table public.hashie_knowledge_documents (
  source_id text primary key,
  content_hash text not null,
  topic text not null,
  subtopic text not null,
  question text not null,
  answer text not null,
  retrieval_text text not null,
  embedding extensions.vector(1536) not null,
  embedding_model text not null default 'text-embedding-3-small',
  embedding_dimensions integer not null default 1536,
  status text not null default 'approved',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint hashie_knowledge_documents_source_id_format check (source_id ~ '^[0-9a-f]{64}$'),
  constraint hashie_knowledge_documents_content_hash_format check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint hashie_knowledge_documents_nonempty_content check (
    topic = btrim(topic) and topic <> '' and subtopic = btrim(subtopic) and subtopic <> ''
    and question = btrim(question) and question <> '' and answer = btrim(answer) and answer <> ''
  ),
  constraint hashie_knowledge_documents_embedding_dimensions check (embedding_dimensions = 1536),
  constraint hashie_knowledge_documents_status check (status = 'approved')
);

create index hashie_knowledge_documents_embedding_cosine_idx
  on public.hashie_knowledge_documents
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.hashie_knowledge_documents enable row level security;
alter table public.hashie_knowledge_documents force row level security;

revoke all on table public.hashie_knowledge_documents from public, anon, authenticated;
grant all on table public.hashie_knowledge_documents to service_role;

create or replace function public.hashie_match_knowledge_documents(
  p_query_embedding extensions.vector(1536),
  p_match_threshold double precision default 0.72,
  p_match_count integer default 5
)
returns table (
  source_id text,
  topic text,
  subtopic text,
  question text,
  answer text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    document.source_id,
    document.topic,
    document.subtopic,
    document.question,
    document.answer,
    1 - (document.embedding <=> p_query_embedding) as similarity
  from public.hashie_knowledge_documents as document
  where document.status = 'approved'
    and 1 - (document.embedding <=> p_query_embedding) >= greatest(least(p_match_threshold, 1), 0)
  order by document.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 8);
$$;

revoke all on function public.hashie_match_knowledge_documents(extensions.vector, double precision, integer) from public, anon, authenticated;
grant execute on function public.hashie_match_knowledge_documents(extensions.vector, double precision, integer) to service_role;
