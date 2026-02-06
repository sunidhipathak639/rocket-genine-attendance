# Database migrations

## Fix login 500 (media table missing columns)

If staff login returns **500** and the error mentions `media` and columns like `thumbnail_u_r_l` or `sizes_thumbnail_url`, your Postgres `media` table is missing columns added by Payload’s upload feature.

**Apply the fix once:**

1. **Option A – Vercel Postgres**  
   In Vercel: Storage → your Postgres → Query (or connect with a SQL client). Run the contents of `0001_media_upload_columns.sql`.

2. **Option B – `psql`**  
   ```bash
   psql "$POSTGRES_URL" -f src/migrations/0001_media_upload_columns.sql
   ```

3. **Option C – Any SQL client**  
   Open `0001_media_upload_columns.sql` and run each `ALTER TABLE "media" ADD COLUMN IF NOT EXISTS ...` statement.

After that, redeploy or restart the app and try logging in again.
