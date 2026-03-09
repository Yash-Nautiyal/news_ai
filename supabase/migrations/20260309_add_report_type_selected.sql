-- Add 'selected' to report_type enum so selected-articles PDF reports can be stored.
-- Run once (e.g. in Supabase SQL editor or psql).
-- If you see "already exists", the value was added previously; safe to ignore.
--
-- Also ensure Storage bucket "media-uploads" exists (Supabase Dashboard → Storage)
-- so report PDFs can be uploaded. Bucket can be public for download links.

ALTER TYPE report_type ADD VALUE 'selected';
