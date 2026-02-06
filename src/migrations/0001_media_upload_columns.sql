-- Add missing media columns required by Payload upload (thumbnailURL + imageSizes).
-- Run this once on your Postgres DB to fix "Failed query" on login when users have profileImage.
-- Example: psql $POSTGRES_URL -f src/migrations/0001_media_upload_columns.sql
-- Or in Vercel: connect to your Postgres and run these statements.

-- Base upload field (Payload always expects this for upload collections)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "thumbnail_u_r_l" varchar;

-- Image sizes: thumbnail
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_url" varchar;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_width" integer;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_height" integer;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_mime_type" varchar;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filesize" integer;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filename" varchar;

-- Image sizes: card
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_url" varchar;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_width" integer;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_height" integer;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_mime_type" varchar;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_filesize" integer;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_filename" varchar;
