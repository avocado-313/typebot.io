-- ChatSession.state carries a snapshot of the typebot, so live sessions keep
-- sending the S3 URLs they started with. ChatSession is ~36 GB, so this only
-- touches sessions updated in the last :days days (default 30), walking the
-- primary key in batches and committing after each one so locks stay short.
-- Run rewrite-urls.sql first in the same database (it creates the backup table).
--
--   kubectl exec -i -n azeer-bot typebot-db-0 -- psql -U typebot -d typebot \
--     -v ON_ERROR_STOP=1 \
--     -v new_base=https://storage.googleapis.com/azeer-gcp-prod-media-bot-public \
--     -v days=30 < rewrite-chat-sessions.sql

\if :{?new_base}
\else
  \echo 'ERROR: pass -v new_base=https://storage.googleapis.com/<public bucket>'
  \quit
\endif
\if :{?days}
\else
  \set days 30
\endif

SET statement_timeout = 0;

CREATE TEMP TABLE gcs_url_map (old text PRIMARY KEY, new text NOT NULL);
INSERT INTO gcs_url_map (old, new)
SELECT scheme || rest, :'new_base'
FROM (VALUES ('https://'), ('http://')) s (scheme),
     (VALUES
        ('s3.me-south-1.amazonaws.com/media.bot.mottasl.ai'),
        ('s3-me-south-1.amazonaws.com/media.bot.mottasl.ai'),
        ('media.bot.mottasl.ai.s3.me-south-1.amazonaws.com'),
        ('s3.amazonaws.com/media.bot.mottasl.ai'),
        ('media.bot.mottasl.ai.s3.amazonaws.com'),
        ('media.bot.mottasl.ai'),
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
  FOR r IN SELECT old, new FROM gcs_url_map ORDER BY length(old) DESC LOOP
    v := replace(v, r.old || '/public/', r.new || '/public/');
  END LOOP;
  RETURN v;
END
$$;

CREATE PROCEDURE pg_temp.gcs_rewrite_sessions(since timestamptz, batch int)
LANGUAGE plpgsql AS $$
DECLARE
  last_id text := '';
  ids     text[];
  total   bigint := 0;
  n       bigint;
BEGIN
  LOOP
    SELECT array_agg(id ORDER BY id) INTO ids
    FROM (
      SELECT id FROM "ChatSession"
      WHERE id > last_id AND "updatedAt" >= since
      ORDER BY id
      LIMIT batch
    ) s;
    EXIT WHEN ids IS NULL;
    last_id := ids[array_upper(ids, 1)];

    INSERT INTO "_gcs_media_url_backup" (tbl, col, pk, old_value)
    SELECT 'ChatSession', 'state', jsonb_build_object('id', id), state::text
    FROM "ChatSession"
    WHERE id = ANY (ids)
      AND state::text LIKE '%media.bot.mottasl.ai%'
      AND pg_temp.gcs_rewrite(state::text) <> state::text;

    UPDATE "ChatSession"
    SET state = pg_temp.gcs_rewrite(state::text)::jsonb
    WHERE id = ANY (ids)
      AND state::text LIKE '%media.bot.mottasl.ai%'
      AND pg_temp.gcs_rewrite(state::text) <> state::text;
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    COMMIT;
  END LOOP;
  RAISE NOTICE 'ChatSession.state: % rows rewritten', total;
END
$$;

CALL pg_temp.gcs_rewrite_sessions(now() - (:'days' || ' days')::interval, 500);
