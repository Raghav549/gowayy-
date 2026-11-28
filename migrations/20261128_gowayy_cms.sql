-- Safe additive migration. Apply on a staging Neon branch first, then production with backup.
CREATE TABLE IF NOT EXISTS gw_home_categories (
 id text PRIMARY KEY, label text NOT NULL, href text NOT NULL, image_url text NOT NULL,
 ring text NOT NULL, position integer NOT NULL DEFAULT 0, enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gw_home_banners (
 id text PRIMARY KEY, label text NOT NULL, title text NOT NULL DEFAULT '', detail text NOT NULL DEFAULT '',
 href text NOT NULL, image_url text NOT NULL, code text NOT NULL DEFAULT '',
 position integer NOT NULL DEFAULT 0, enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_home_categories_position_idx ON gw_home_categories(position);
CREATE INDEX IF NOT EXISTS gw_home_banners_position_idx ON gw_home_banners(position);
-- Initial data must be imported explicitly from the existing constants using the backfill command;
-- do not introduce fake/promotional pricing into live data.
