-- Rewrites stored S3 media URLs to the GCS public bucket. Keys are unchanged
-- (public/...), only the scheme+host+bucket part of each URL is swapped.
--
-- Safe to re-run: rows already on GCS no longer match. Every value it changes
-- is copied to "_gcs_media_url_backup" first, so it can be undone with
-- restore-urls.sql. One transaction per column, so a failure leaves earlier
-- columns done and later ones untouched; re-running picks up where it stopped.
--
--   kubectl exec -i -n azeer-bot typebot-db-0 -- psql -U typebot -d typebot \
--     -v ON_ERROR_STOP=1 \
--     -v new_base=https://storage.googleapis.com/azeer-gcp-prod-media-bot-public \
--     < rewrite-urls.sql
--
-- new_base must be exactly what getPublicFileUrl() returns minus "/<key>",
-- i.e. GCS_PUBLIC_URL if set, else https://storage.googleapis.com/<GCS_PUBLIC_BUCKET>.

\if :{?new_base}
\else
  \echo 'ERROR: pass -v new_base=https://storage.googleapis.com/<public bucket>'
  \quit
\endif

SET statement_timeout = 0;

CREATE TABLE IF NOT EXISTS "_gcs_media_url_backup" (
  id          bigserial PRIMARY KEY,
  tbl         text        NOT NULL,
  col         text        NOT NULL,
  pk          jsonb       NOT NULL,
  old_value   text        NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now()
);

-- Old prefixes, no trailing slash. Only "<old>/public/" is replaced, which keeps
-- "https://media.bot.mottasl.ai" from matching inside the longer
-- "https://media.bot.mottasl.ai.s3...." host. Add anything discover-urls.sql
-- printed that is missing here.
CREATE TEMP TABLE gcs_url_map (old text PRIMARY KEY, new text NOT NULL);
INSERT INTO gcs_url_map (old, new)
SELECT scheme || rest, :'new_base'
FROM (VALUES ('https://'), ('http://')) s (scheme),
     (VALUES
        -- original bucket, me-south-1 (until 2026-09-28)
        ('s3.me-south-1.amazonaws.com/media.bot.mottasl.ai'),
        ('s3-me-south-1.amazonaws.com/media.bot.mottasl.ai'),
        ('media.bot.mottasl.ai.s3.me-south-1.amazonaws.com'),
        ('s3.amazonaws.com/media.bot.mottasl.ai'),
        ('media.bot.mottasl.ai.s3.amazonaws.com'),
        ('media.bot.mottasl.ai'),
        -- DR bucket, eu-west-1 (since 2026-09-28)
        ('s3.eu-west-1.amazonaws.com/dr-media.bot.mottasl.ai'),
        ('s3-eu-west-1.amazonaws.com/dr-media.bot.mottasl.ai'),
        ('dr-media.bot.mottasl.ai.s3.eu-west-1.amazonaws.com'),
        ('s3.amazonaws.com/dr-media.bot.mottasl.ai'),
        ('dr-media.bot.mottasl.ai.s3.amazonaws.com'),
        ('dr-media.bot.mottasl.ai')
     ) r (rest);

CREATE FUNCTION pg_temp.gcs_rewrite(v text) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r record;
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  FOR r IN SELECT old, new FROM gcs_url_map ORDER BY length(old) DESC LOOP
    v := replace(v, r.old || '/public/', r.new || '/public/');
  END LOOP;
  RETURN v;
END
$$;

-- Backs up and rewrites one column. pk_expr builds the jsonb row key used by
-- restore-urls.sql; is_json says whether the column is jsonb.
CREATE PROCEDURE pg_temp.gcs_rewrite_column(tbl text, col text, pk_expr text, is_json boolean)
LANGUAGE plpgsql AS $$
DECLARE
  val    text := CASE WHEN is_json THEN format('%I::text', col) ELSE format('%I', col) END;
  newval text := CASE WHEN is_json THEN format('pg_temp.gcs_rewrite(%I::text)::jsonb', col)
                                   ELSE format('pg_temp.gcs_rewrite(%I)', col) END;
  -- the cheap LIKE prefilter, then the exact check that something would change
  cond   text := format('%1$s LIKE ''%%media.bot.mottasl.ai%%'' AND pg_temp.gcs_rewrite(%1$s) <> %1$s', val);
  n      bigint;
BEGIN
  EXECUTE format(
    'INSERT INTO "_gcs_media_url_backup" (tbl, col, pk, old_value)
     SELECT %L, %L, %s, %s FROM %I WHERE %s',
    tbl, col, pk_expr, val, tbl, cond);
  EXECUTE format('UPDATE %I SET %I = %s WHERE %s', tbl, col, newval, cond);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '%.%: % rows rewritten', tbl, col, n;
  COMMIT;
END
$$;

CALL pg_temp.gcs_rewrite_column('User',                   'image',            $$jsonb_build_object('id', id)$$, false);
CALL pg_temp.gcs_rewrite_column('Workspace',              'icon',             $$jsonb_build_object('id', id)$$, false);
CALL pg_temp.gcs_rewrite_column('Typebot',                'icon',             $$jsonb_build_object('id', id)$$, false);
CALL pg_temp.gcs_rewrite_column('Typebot',                'groups',           $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('Typebot',                'events',           $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('Typebot',                'variables',        $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('Typebot',                'theme',            $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('Typebot',                'settings',         $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('PublicTypebot',          'groups',           $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('PublicTypebot',          'events',           $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('PublicTypebot',          'variables',        $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('PublicTypebot',          'theme',            $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('PublicTypebot',          'settings',         $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('ThemeTemplate',          'theme',            $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('Result',                 'variables',        $$jsonb_build_object('id', id)$$, true);
CALL pg_temp.gcs_rewrite_column('SetVariableHistoryItem', 'value',            $$jsonb_build_object('resultId', "resultId", 'index', index)$$, true);
CALL pg_temp.gcs_rewrite_column('Answer',                 'content',          $$jsonb_build_object('resultId', "resultId", 'blockId', "blockId", 'groupId', "groupId")$$, false);
CALL pg_temp.gcs_rewrite_column('AnswerV2',               'content',          $$jsonb_build_object('id', id)$$, false);
CALL pg_temp.gcs_rewrite_column('AnswerV2',               'attachedFileUrls', $$jsonb_build_object('id', id)$$, true);

-- What is left. Expect only private/ links (if any) or hosts discover-urls.sql
-- flagged that are not in gcs_url_map.
SELECT 'leftover' AS check, count(*) AS typebots_still_on_s3
FROM "Typebot"
WHERE (groups::text || theme::text || settings::text || coalesce(icon, '')) LIKE '%media.bot.mottasl.ai%';
