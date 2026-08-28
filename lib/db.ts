import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
export const db = connectionString ? postgres(connectionString, { max: 1, ssl: 'require' }) : null;

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await db`ALTER TABLE content ADD COLUMN IF NOT EXISTS extra_links JSONB NOT NULL DEFAULT '[]'::jsonb`;
}
