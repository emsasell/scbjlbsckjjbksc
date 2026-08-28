import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
export const db = connectionString ? postgres(connectionString, { max: 1, ssl: 'require', prepare: false }) : null;

export async function ensureSchema() {
  if (!db) return;
  await db`CREATE TABLE IF NOT EXISTS content (
    id BIGSERIAL PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('news','district','tab','link')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    body TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    video_url TEXT,
    published_at TIMESTAMPTZ,
    url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS extra_links JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS video_title TEXT`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS video_description TEXT`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS video_preview TEXT`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS district_id BIGINT`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS author_user_id BIGINT`;
  await db`CREATE INDEX IF NOT EXISTS content_status_idx ON content(status, published_at)`;
  await db`CREATE TABLE IF NOT EXISTS creators (id BIGSERIAL PRIMARY KEY, nickname TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', avatar_url TEXT, url TEXT, district_id BIGINT REFERENCES content(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await db`CREATE TABLE IF NOT EXISTS users (id BIGSERIAL PRIMARY KEY, login TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', can_admin BOOLEAN NOT NULL DEFAULT FALSE, creator_id BIGINT REFERENCES creators(id) ON DELETE SET NULL, display_name TEXT, district_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  // Compatibility migrations for databases created by older MegaMine builds.
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS district_id BIGINT`;
  await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS can_admin BOOLEAN NOT NULL DEFAULT FALSE`;
  await db`CREATE TABLE IF NOT EXISTS action_log (id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;

}
