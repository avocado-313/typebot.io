-- Rollback for rewrite-urls.sql / rewrite-chat-sessions.sql: puts every backed
-- up value back (the oldest backup per row, i.e. the original S3 URL). Only
-- useful while the S3 buckets are still readable.
--
--   kubectl exec -i -n azeer-bot typebot-db-0 -- psql -U typebot -d typebot \
--     -v ON_ERROR_STOP=1 < restore-urls.sql

SET statement_timeout = 0;

DO $$
DECLARE
  r       record;
  pk_expr text;
  n       bigint;
BEGIN
  FOR r IN
    SELECT DISTINCT b.tbl, b.col, c.data_type = 'jsonb' AS is_json
    FROM "_gcs_media_url_backup" b
    JOIN information_schema.columns c
      ON c.table_schema = current_schema() AND c.table_name = b.tbl AND c.column_name = b.col
  LOOP
    pk_expr := CASE r.tbl
      WHEN 'SetVariableHistoryItem' THEN $x$jsonb_build_object('resultId', t."resultId", 'index', t.index)$x$
      WHEN 'Answer' THEN $x$jsonb_build_object('resultId', t."resultId", 'blockId', t."blockId", 'groupId', t."groupId")$x$
      ELSE $x$jsonb_build_object('id', t.id)$x$
    END;
    EXECUTE format(
      'UPDATE %I t SET %I = b.old_value%s
       FROM (SELECT DISTINCT ON (pk) pk, old_value
             FROM "_gcs_media_url_backup" WHERE tbl = %L AND col = %L
             ORDER BY pk, id) b
       WHERE %s = b.pk',
      r.tbl, r.col, CASE WHEN r.is_json THEN '::jsonb' ELSE '' END, r.tbl, r.col, pk_expr);
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '%.%: % rows restored', r.tbl, r.col, n;
  END LOOP;
END
$$;
