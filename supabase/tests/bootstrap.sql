-- 테스트에서만 사용하는 서비스 경계. SQL Editor에는 schema.sql만 실행합니다.
create role anon;
create role authenticated;
create schema auth;
create schema storage;
create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
create table storage.buckets(
  id text primary key, name text not null, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects(
  bucket_id text not null references storage.buckets(id), name text not null, primary key(bucket_id, name)
);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select parts[1:cardinality(parts)-1] from (select string_to_array(name, '/') as parts) p
$$;
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant usage on schema auth, storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;

-- 넓은 초기 ACL에서도 앱 스키마가 필요한 권한만 남기는지 확인합니다.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
