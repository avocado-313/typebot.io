-- Read-only. Lists every distinct S3 URL prefix still stored in the Typebot DB,
-- per column, with how many rows carry it. Run it before rewrite-urls.sql and
-- make sure every prefix it prints is in that file's gcs_url_map.
--
--   kubectl exec -i -n azeer-bot typebot-db-0 -- psql -U typebot -d typebot < discover-urls.sql
--
-- ChatSession (~36 GB) is deliberately left out; rewrite-chat-sessions.sql
-- handles it in batches.

SET default_transaction_read_only = on;
SET statement_timeout = '30min';

WITH src (col, v) AS (
            SELECT 'User.image',                     image                     FROM "User"                   WHERE image                     LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Workspace.icon',                 icon                      FROM "Workspace"              WHERE icon                      LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Typebot.icon',                   icon                      FROM "Typebot"                WHERE icon                      LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Typebot.groups',                 groups::text              FROM "Typebot"                WHERE groups::text              LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Typebot.events',                 events::text              FROM "Typebot"                WHERE events::text              LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Typebot.variables',              variables::text           FROM "Typebot"                WHERE variables::text           LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Typebot.theme',                  theme::text               FROM "Typebot"                WHERE theme::text               LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Typebot.settings',               settings::text            FROM "Typebot"                WHERE settings::text            LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'PublicTypebot.groups',           groups::text              FROM "PublicTypebot"          WHERE groups::text              LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'PublicTypebot.events',           events::text              FROM "PublicTypebot"          WHERE events::text              LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'PublicTypebot.variables',        variables::text           FROM "PublicTypebot"          WHERE variables::text           LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'PublicTypebot.theme',            theme::text               FROM "PublicTypebot"          WHERE theme::text               LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'PublicTypebot.settings',         settings::text            FROM "PublicTypebot"          WHERE settings::text            LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'ThemeTemplate.theme',            theme::text               FROM "ThemeTemplate"          WHERE theme::text               LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Result.variables',               variables::text           FROM "Result"                 WHERE variables::text           LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'SetVariableHistoryItem.value',   value::text               FROM "SetVariableHistoryItem" WHERE value::text               LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'Answer.content',                 content                   FROM "Answer"                 WHERE content                   LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'AnswerV2.content',               content                   FROM "AnswerV2"               WHERE content                   LIKE '%media.bot.mottasl.ai%'
  UNION ALL SELECT 'AnswerV2.attachedFileUrls',      "attachedFileUrls"::text  FROM "AnswerV2"               WHERE "attachedFileUrls"::text  LIKE '%media.bot.mottasl.ai%'
)
SELECT col,
       m[1]              AS prefix,
       m[2]              AS top_folder,
       count(*)          AS occurrences
FROM src,
     regexp_matches(v, '(https?://[^"\s,]*media\.bot\.mottasl\.ai[^"\s,]*?)/(public|private)/', 'g') AS m
GROUP BY 1, 2, 3
ORDER BY 2, 1;

-- Safety net: any other S3/CloudFront host serving /public/ keys (e.g. an
-- S3_PUBLIC_CUSTOM_DOMAIN that was never the bucket name). Upstream template
-- assets (typebot.s3.eu-west-3..., s3.typebot.io) show up here too and are NOT
-- ours: leave them out of the map.
WITH src (col, v) AS (
            SELECT 'Typebot.groups',       groups::text FROM "Typebot"       WHERE groups::text ~ '(amazonaws\.com|cloudfront\.net)'
  UNION ALL SELECT 'Typebot.theme',        theme::text  FROM "Typebot"       WHERE theme::text  ~ '(amazonaws\.com|cloudfront\.net)'
  UNION ALL SELECT 'PublicTypebot.groups', groups::text FROM "PublicTypebot" WHERE groups::text ~ '(amazonaws\.com|cloudfront\.net)'
  UNION ALL SELECT 'PublicTypebot.theme',  theme::text  FROM "PublicTypebot" WHERE theme::text  ~ '(amazonaws\.com|cloudfront\.net)'
)
SELECT col, m[1] AS other_host, count(*) AS occurrences
FROM src,
     -- host + first path segment, so path-style URLs show their bucket
     regexp_matches(v, 'https?://([^/"\s,]*(?:amazonaws\.com|cloudfront\.net)(?:/[^/"\s,]+)?)/', 'g') AS m
WHERE m[1] NOT LIKE '%media.bot.mottasl.ai%'
GROUP BY 1, 2
ORDER BY 3 DESC;
