// Gate 2B.11 — Historical FAILED Outbox reconciliation runner.
//
// DEFAULT (no args): READ-ONLY audit. Zero database writes.
//   node scripts/reconcile-outbox-failed.js
//
// OPT-IN replay of SAFE_TO_REPLAY rows through the SHARED production
// EventBus/subscriber wiring:
//   node scripts/reconcile-outbox-failed.js --apply
//
// Replay flow per row:
//   FAILED row -> EventFactory.fromOutbox -> shared EventBus -> normal
//   subscriber delivery -> guarded transition FAILED -> PUBLISHED.
// No direct `UPDATE outbox SET status='PUBLISHED'`. No deletion. No payload,
// event_name, aggregate_id, or created_at rewriting.
process.env.DOTENV_CONFIG_PATH = '.env';
require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

const EventFactory = require('../src/infrastructure/events/factory/EventFactory');
const EventRegistry = require('../src/infrastructure/events/registry/EventRegistry');
const buildEventBus = require('../src/infrastructure/events/event-bus');
const { classifyFailedRow, VERDICTS } = require('../src/infrastructure/events/reconciliation/outboxRowClassifier');

const APPLY_FLAG = process.argv.includes('--apply');
const REPLAY_LABEL = 'reconcile-2B.11';

const connectionString = process.env.DATABASE_URL.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
const parsedUrl = new URL(connectionString);
const schema = parsedUrl.searchParams.get('schema');
if (schema) parsedUrl.searchParams.set('options', `-c search_path=${schema}`);
const client = new Pool({ connectionString: parsedUrl.toString() });
const prisma = new PrismaClient({ adapter: new PrismaPg(client, schema ? { schema } : undefined) });

(async () => {
  const rows = await prisma.outboxEvent.findMany({
    where: { status: 'FAILED' },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      event_name: true,
      aggregate_id: true,
      aggregate_type: true,
      event_version: true,
      correlation_id: true,
      causation_id: true,
      payload: true,
      metadata: true,
      occurred_at: true,
      retry_count: true,
      next_retry_at: true,
      error_message: true,
      created_at: true,
      status: true,
    },
  });

  const classified = rows.map((row) => ({
    row,
    result: classifyFailedRow(row, EventRegistry, EventFactory),
  }));

  const totals = { FAILED: rows.length, SAFE_TO_REPLAY: 0, UNREGISTERED: 0, NOT_RECONSTRUCTIBLE: 0 };
  const byEventName = new Map();

  for (const { row, result } of classified) {
    totals[result.verdict] += 1;
    if (!byEventName.has(row.event_name)) {
      byEventName.set(row.event_name, { event_name: row.event_name, SAFE_TO_REPLAY: 0, UNREGISTERED: 0, NOT_RECONSTRUCTIBLE: 0 });
    }
    byEventName.get(row.event_name)[result.verdict] += 1;
  }

  console.log('OUTBOX_RECON_MODE ' + (APPLY_FLAG ? 'APPLY' : 'DRY_RUN'));
  console.log('OUTBOX_RECON_TOTALS ' + JSON.stringify(totals));
  console.log('OUTBOX_RECON_BY_EVENT ' + JSON.stringify([...byEventName.values()]));

  for (const { row, result } of classified) {
    console.log(
      'OUTBOX_RECON_ROW ' +
        JSON.stringify({
          id: row.id,
          event_name: row.event_name,
          aggregate_type: row.aggregate_type,
          aggregate_id: row.aggregate_id,
          retry_count: row.retry_count,
          created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
          verdict: result.verdict,
          reason: result.reason,
        })
    );
  }

  if (APPLY_FLAG) {
    const eventBus = buildEventBus();

    for (const { row, result } of classified) {
      const outcome = { id: row.id, event_name: row.event_name, result: null, detail: null };

      if (result.verdict !== VERDICTS.SAFE_TO_REPLAY) {
        outcome.result = result.verdict === VERDICTS.UNREGISTERED ? 'SKIPPED_UNREGISTERED' : 'SKIPPED_NOT_RECONSTRUCTIBLE';
        console.log('OUTBOX_RECON_RESULT ' + JSON.stringify(outcome));
        continue;
      }

      const current = await prisma.outboxEvent.findUnique({
        where: { id: row.id },
        select: { id: true, status: true },
      });

      if (!current || current.status !== 'FAILED') {
        outcome.result = 'FAILED_REPLAY';
        outcome.detail = `row is no longer FAILED (status=${current ? current.status : 'missing'}), state not overwritten`;
        console.log('OUTBOX_RECON_RESULT ' + JSON.stringify(outcome));
        continue;
      }

      try {
        const event = EventFactory.fromOutbox(row);
        await eventBus.publish(event);
      } catch (err) {
        outcome.result = 'FAILED_REPLAY';
        outcome.detail = `delivery failed, row remains FAILED: ${err.message}`;
        console.log('OUTBOX_RECON_RESULT ' + JSON.stringify(outcome));
        continue;
      }

      const guarded = await prisma.outboxEvent.updateMany({
        where: { id: row.id, status: 'FAILED' },
        data: { status: 'PUBLISHED', published_at: new Date(), published_by: REPLAY_LABEL },
      });

      if (guarded.count === 0) {
        outcome.result = 'FAILED_REPLAY';
        outcome.detail = 'guarded transition matched 0 rows (state changed concurrently), state not overwritten';
      } else {
        outcome.result = 'REPLAYED';
        outcome.detail = `delivered via shared EventBus and marked PUBLISHED by ${REPLAY_LABEL}`;
      }
      console.log('OUTBOX_RECON_RESULT ' + JSON.stringify(outcome));
    }
  }

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('OUTBOX_RECON_ERROR ' + err.message);
  await prisma.$disconnect();
  process.exit(1);
});
