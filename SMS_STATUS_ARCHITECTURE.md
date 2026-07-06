# SMS Delivery Status Architecture

Production architecture for keeping SMS delivery statuses in MongoDB up to
date, designed for 10k → 100k → 1M+ SMS/day on Render.

## Overview

```text
Render Web Service (Next.js)
  - sends SMS, displays history/reports (reads MongoDB only)
  - admin manual sync (super admin)
  - DLR webhook receiver (/api/sms/dlr)
  - NO automatic status polling, NO frontend timers

MongoDB
  - SMS records with providerMessageId, latest status, nextCheckAt,
    statusCheckAttempts, lease fields (statusCheckLockedUntil/WorkerId)
  - indexed for batch processing at tens of millions of rows

Render Background Worker (npm run worker:sms-status)
  - continuously claims due pending SMS via atomic MongoDB leases
  - calls the HostPinnacle status API (rate limited + circuit breaker)
  - updates MongoDB immediately, reschedules nextCheckAt with backoff
  - safe to run multiple instances
```

The database always holds the latest known status. Users see current data the
moment they load a page — no page needs to trigger synchronization.

## Status model

Pending (worker keeps checking): `queued`, `sent`, `processing`, `retrying`

Final (never checked again): `delivered`, `failed`, `expired`, `rejected`,
`undeliverable`, `provider_timeout`

Provider mapping lives in one place: `lib/services/sms-status/status-mapper.ts`
(e.g. `DELIVRD → delivered`, `SUBMITTED → sent`, `UNDELIV → undeliverable`,
unknown → `processing` so checking continues).

## Key modules

| Module | Responsibility |
| --- | --- |
| `lib/services/sms-status/status-mapper.ts` | HostPinnacle status → internal status |
| `lib/services/sms-status/retry-scheduler.ts` | Backoff schedule + provider timeout |
| `lib/services/sms-status/status-repository.ts` | All MongoDB access incl. atomic work claiming |
| `lib/services/sms-status/synchronizer.ts` | `SmsStatusSynchronizer` — the single sync service |
| `lib/services/sms-status/build-synchronizer.ts` | Dependency wiring (worker + web share it) |
| `lib/services/hostpinnacle/status-client.ts` | Hardened provider client (timeout, retries, backoff, 429/5xx, rate limit, circuit breaker) |
| `lib/worker/processor.ts` | Worker main loop with graceful shutdown |
| `lib/worker/logger.ts` | Structured JSON logging |
| `lib/config/sms-status-config.ts` | Env config, validated at startup |
| `worker/sms-status-worker.ts` | Render Background Worker entry point |

`SmsStatusSynchronizer` is used by all three consumers — background worker,
admin manual sync (`POST /api/super-admin/sms-status/sync`), and the DLR
webhook (`applyProviderStatus`). There is exactly one copy of the sync logic.

## Work claiming (multi-worker safe)

Workers claim messages with repeated atomic `findOneAndUpdate` operations:

1. Match: pending status, `nextCheckAt <= now`, and no live lease
   (`statusCheckLockedUntil` null or expired).
2. Atomically set `statusCheckLockedUntil = now + CLAIM_LEASE_SECONDS`,
   `statusCheckWorkerId`, and `$inc statusCheckAttempts` in the same operation.
3. Only the matched document is returned to the claiming worker — two workers
   can never claim the same message.
4. HostPinnacle is called **outside** any database transaction.
5. The message is finalized or rescheduled, clearing the lease. If a worker
   crashes, its leases expire automatically and messages become claimable.

The claim query is covered by the partial index `pending_status_check`
(`{ nextCheckAt, status, createdAt }`, filtered to pending statuses), so the
worker never scans the collection regardless of its size. Claims are sorted
by `nextCheckAt` only (the index's leading key) so MongoDB satisfies both the
filter and the ordering with an IXSCAN and never needs an in-memory sort.

Verify in production with:

```bash
npx tsx scripts/verify-indexes.ts          # prints indexes + explain plan
npx tsx scripts/verify-indexes.ts --sync   # also builds any missing indexes
```

## Retry policy

`RETRY_INTERVALS_SECONDS=30,120,300,900,1800,3600,10800,21600,43200,86400`

After sending, the first check happens after 30s, then 2m, 5m, 15m, 30m, 1h,
3h, 6h, 12h, 24h; the last interval repeats. If a message is still non-final
`PROVIDER_FINAL_TIMEOUT_HOURS` (default 72h) after sending, it is marked
`provider_timeout` and never checked again (no automatic refund, since the
outcome is unknown).

## Failure handling

- **Provider timeout / 5xx / network error**: retried with exponential backoff
  and jitter (up to `MAX_RETRIES`), then the message's lease is released and
  it is rescheduled. The worker never crashes.
- **HTTP 429**: counts as a transient failure with an extra pause.
- **Provider outage**: after `CIRCUIT_BREAKER_FAILURE_THRESHOLD` consecutive
  failures the circuit opens; all lookups short-circuit for
  `CIRCUIT_BREAKER_COOLDOWN_MS`, affected messages are released for later.
- **One bad message never stops a batch** — each message is isolated.
- **Refunds**: final failure statuses (`failed`, `expired`, `rejected`,
  `undeliverable`) refund credits once (atomic guard on the `refunded` flag),
  except when the cause is a blacklisted sender ID (existing business rule).

## Sending flow

Every send path (`/api/sms/send`, `/api/v1/sms/send`, `/api/sms/bulk-send`
via the queue services) now sets on creation/successful submit:

- `nextCheckAt = now + first retry interval`
- `statusCheckAttempts = 0`, `lastCheckedAt = null`, `finalizedAt = null`

If the provider rejects the send immediately, the message is finalized as
`failed` with `nextCheckAt = null` and is never picked up by the worker.

## Webhooks

`POST /api/sms/dlr` (HostPinnacle delivery reports) routes through
`synchronizer.applyProviderStatus(providerMessageId, rawStatus, cause)`.
Future direct HostPinnacle webhooks should use the same call. The background
worker remains the fallback for messages that never receive a callback.

## Configuration

All operational values are environment variables validated at startup — see
`.env.example` and `lib/config/sms-status-config.ts`. Nothing operational is
hardcoded.

## Migration for existing data

Legacy pending messages created before this refactor have no `nextCheckAt`
and would never be claimed. Run once after deploying:

```bash
npx tsx scripts/backfill-next-check-at.ts
```

Mongoose creates the new indexes automatically on first connection
(`autoIndex`). For very large existing collections, build them manually with
`createIndex(..., { background: true })` during a low-traffic window instead.

## Deployment (Render)

`render.yaml` defines both services:

- **txtlink-web** — `npm install && npm run build` / `npm run start`, health
  check `GET /api/health` (verifies MongoDB connectivity).
- **txtlink-sms-status-worker** — `npm install` / `npm run worker:sms-status`.
  Scale horizontally by adding instances; lease-based claiming keeps them safe.

Vercel cron and all browser-based synchronization have been removed.

## Scaling notes

- **10k/day**: one worker instance at defaults is idle most of the time.
- **100k/day**: raise `RATE_LIMIT_PER_SECOND` / `WORKER_CONCURRENCY` to match
  the provider account's allowance; still one instance.
- **1M+/day**: add worker instances (no code changes), consider sharding the
  provider credentials, and rely on DLR webhooks as the primary signal with
  the worker as reconciliation. The partial index keeps claim queries O(batch).

## Testing

`npm test` runs Vitest suites covering the retry scheduler, status mapper,
provider client error handling (timeout/429/5xx/circuit breaker), and the
synchronizer's finalize/reschedule/refund/timeout behavior.
