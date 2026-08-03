-- vanta-dm schema (hosted Neon Postgres)

create table if not exists funnels (
  id serial primary key,
  name text not null,                 -- human label, e.g. reel name
  ig_media_id text,                   -- IG media id the funnel is armed on (null = any media)
  keyword text not null,              -- case-insensitive substring match on comment text
  link text not null,                 -- the deliverable
  copy jsonb not null,                -- { opening, opening_button, gate, gate_button, delivery }
  public_replies jsonb,               -- optional array of comment-reply variants, picked at random
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id serial primary key,
  funnel_id int not null references funnels(id),
  ig_user_id text not null,           -- IGSID of the commenter
  username text,
  state text not null default 'dm_sent',  -- dm_sent | gated | delivered
  comment_id text,
  gate_nudged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (funnel_id, ig_user_id)
);

create table if not exists events (
  id serial primary key,
  funnel_id int,
  ig_user_id text,
  type text not null,                 -- comment | dm_sent | public_reply | button | gate | delivered | error
  detail jsonb,
  created_at timestamptz not null default now()
);
