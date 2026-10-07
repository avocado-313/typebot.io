# Typebot media: S3 → GCS

Moves builder/viewer file storage from S3 to GCS without losing any media
uploaded so far.

## What changes

`packages/lib/s3/*` switches to GCS when `GCS_BUCKET` is set. With it unset,
storage stays on S3 exactly as before. That is the rollback.

| Env (Doppler `azeer-bot/prd`) | Value |
| --- | --- |
| `GCS_BUCKET` | `azeer-gcp-prod-media-bot` (private: `private/` result files) |
| `GCS_PUBLIC_BUCKET` | `azeer-gcp-prod-media-bot-public` (public-read: `public/` media) |
| `GCP_MEDIA_SA_KEY` | JSON key of a service account with `roles/storage.objectAdmin` on both buckets |
| `GCS_PUBLIC_URL` | optional CDN base URL for public files; default `https://storage.googleapis.com/<GCS_PUBLIC_BUCKET>` |

Why two buckets: in S3 only `public/*` was world-readable. GCS can't do that
inside one bucket. Uniform bucket-level access rules out object ACLs, and IAM
conditions are not allowed on `allUsers`. Keys route by prefix (`public/` goes
to the public bucket, everything else to the private one) and stay
byte-for-byte the S3 keys.

Old URLs live in the DB (typebot JSON, answers, avatars, chat sessions) and
point at S3 hosts:

- `s3.me-south-1.amazonaws.com/media.bot.mottasl.ai/...`: the original bucket, used until 2026-09-28
- `s3.eu-west-1.amazonaws.com/dr-media.bot.mottasl.ai/...`: the DR bucket, used since 2026-09-28

"No loss" means two things. Every object has to be in GCS under the same key,
and every stored URL has to be rewritten to GCS, because the S3 hosts stop
working when AWS is decommissioned.

## 0. Infra prerequisites (azeer-infra, not this repo)

1. **Public bucket** `azeer-gcp-prod-media-bot-public`: public-read,
   `data_class = "public"`. **Do not** add it as a plain entry in
   `s3_migration_buckets`. Each entry there gets a Storage Transfer job for its
   whole `source_s3_bucket`, which would copy `private/` result files into a
   world-readable bucket. Create the bucket without a transfer job and fill it
   with step 2.
2. **CORS on both buckets** for browser uploads: methods `GET, HEAD, POST, PUT`,
   response header `Content-Type`. Origins: copy what the S3 bucket allows
   (`aws s3api get-bucket-cors --bucket dr-media.bot.mottasl.ai`). Use `*` if
   embedded bots on customer sites upload files. The module's current CORS
   allows only `GET`/`HEAD` and only on public buckets.
3. **Service account** (e.g. `typebot-media@azeer-prod`) with
   `roles/storage.objectAdmin` on both buckets. It needs no KMS role: the GCS
   service agent handles CMEK. Put the key JSON in Doppler `azeer-bot/prd` as
   `GCP_MEDIA_SA_KEY`. Core does the same (`core/services/gcs.go`), because the
   cluster has no Workload Identity.

## 1. Make sure the DR bucket holds everything from the original bucket

`dr-media.bot.mottasl.ai` is a replica. Replication only copies objects written
after the rule existed, so check that nothing older is missing. me-south-1 is
unreachable from GCP, so run this from a laptop (`aws login --profile avocado`).

```sh
aws s3api list-objects-v2 --bucket media.bot.mottasl.ai --region me-south-1 \
  --query 'Contents[].Key' --output text | tr '\t' '\n' | sort > src.txt
aws s3api list-objects-v2 --bucket dr-media.bot.mottasl.ai --region eu-west-1 \
  --query 'Contents[].Key' --output text | tr '\t' '\n' | sort > dr.txt
comm -23 src.txt dr.txt > missing-in-dr.txt; wc -l missing-in-dr.txt
```

Copy anything missing straight into GCS. Don't write to AWS.

```sh
while read -r key; do
  case "$key" in public/*) b=azeer-gcp-prod-media-bot-public ;; *) b=azeer-gcp-prod-media-bot ;; esac
  aws s3 cp "s3://media.bot.mottasl.ai/$key" - --region me-south-1 \
    | gcloud storage cp - "gs://$b/$key"
done < missing-in-dr.txt
```

Note: `cp -` drops Content-Type. Afterwards, set the type on those keys with
`gcloud storage objects update --content-type=...`.

## 2. Bulk copy (before cutover)

```sh
# S3 DR bucket -> private GCS bucket (job already defined in azeer-infra)
gcloud transfer jobs list --filter='description~dr-media.bot.mottasl.ai' --format='value(name)'
gcloud transfer jobs run <job-name> --no-async

# public/ only -> public bucket. Intra-GCS, so metadata is preserved.
gcloud storage rsync -r gs://azeer-gcp-prod-media-bot/public gs://azeer-gcp-prod-media-bot-public/public

# verify (azeer-infra)
scripts/s3-gcs-parity.py --missing --only media-bot
```

## 3. Cutover

1. Build and push the builder and viewer images with this change
   (manual build, then bump `values.yaml`).
2. Doppler `azeer-bot/prd`: add `GCS_BUCKET`, `GCS_PUBLIC_BUCKET`,
   `GCP_MEDIA_SA_KEY`. Leave the `S3_*` keys in place for rollback.
3. Roll builder and viewer. ESO syncs the Secret, but pods only pick up env at
   container start.
4. Smoke test:
   - builder image upload: the URL must start with `https://storage.googleapis.com/azeer-gcp-prod-media-bot-public/public/`
   - viewer file-upload block, public visibility
   - viewer file-upload block, private visibility: open it from Results, which redirects to a signed GCS URL
   - an old bot whose images were uploaded before today

## 4. Final delta

S3 gets no new writes after cutover. Copy whatever landed between step 2
and step 3:

```sh
gcloud transfer jobs run <job-name> --no-async
gcloud storage rsync -r gs://azeer-gcp-prod-media-bot/public gs://azeer-gcp-prod-media-bot-public/public
scripts/s3-gcs-parity.py --missing --only media-bot   # must report 0 missing
```

## 5. Rewrite stored URLs

Run only after step 4 shows 0 missing. Pick a quiet hour: `Result` and
`Answer` get full scans.

```sh
DB='kubectl exec -i -n azeer-bot typebot-db-0 -- psql -U typebot -d typebot -v ON_ERROR_STOP=1'
NEW=https://storage.googleapis.com/azeer-gcp-prod-media-bot-public

$DB < discover-urls.sql                     # read-only: every prefix must be in rewrite-urls.sql's map
$DB -v new_base=$NEW < rewrite-urls.sql     # backs up each value to "_gcs_media_url_backup"
$DB -v new_base=$NEW -v days=30 < rewrite-chat-sessions.sql
$DB < discover-urls.sql                     # expect only private/ rows, if any
```

`new_base` must match what `getPublicFileUrl` produces. If `GCS_PUBLIC_URL`
is set, use that.

Re-run `rewrite-urls.sql` a few days later. It is idempotent. An editor that
was open during the rewrite still holds the old URLs in memory and writes
them back on its next save.

## Rollback

- Code: remove `GCS_BUCKET` from Doppler and roll the pods. Files uploaded to
  GCS in the meantime keep working, because their URLs point at GCS.
- URLs: `$DB < restore-urls.sql` puts the original S3 URLs back. This only
  helps while S3 is still readable.

Leave both S3 buckets untouched until the soak is over. Delete nothing.
