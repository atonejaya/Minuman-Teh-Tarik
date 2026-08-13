const EventFactory = require('../factory/EventFactory');

const VERDICTS = Object.freeze({
  SAFE_TO_REPLAY: 'SAFE_TO_REPLAY',
  UNREGISTERED: 'UNREGISTERED',
  NOT_RECONSTRUCTIBLE: 'NOT_RECONSTRUCTIBLE',
});

/**
 * Pure failed-outbox-row classifier (Gate 2B.11).
 * No DB access, no EventBus creation, no side effects.
 *
 * Verdicts:
 * - SAFE_TO_REPLAY        — event name registered AND the row reconstructs.
 * - UNREGISTERED          — no EventRegistry constructor for the event name.
 * - NOT_RECONSTRUCTIBLE   — registered, but required fields are missing,
 *                           payload is unusable, or reconstruction throws.
 *
 * Never classifies by historical age, aggregate type, or subscriber absence.
 *
 * @param {Object} row                OutboxEvent row (Prisma shape).
 * @param {Object} registry           EventRegistry mapping name -> class.
 * @param {Object} eventFactory       EventFactory with static fromOutbox(row).
 * @returns {{ verdict: string, eventName: string, reason: string }}
 */
function classifyFailedRow(row, registry = {}, eventFactory = EventFactory) {
  const eventName = row.event_name;

  if (typeof eventName !== 'string' || !registry[eventName]) {
    return {
      verdict: VERDICTS.UNREGISTERED,
      eventName,
      reason: `No EventRegistry constructor for '${eventName}'`,
    };
  }

  if (typeof row.id !== 'string' || row.id.length === 0) {
    return {
      verdict: VERDICTS.NOT_RECONSTRUCTIBLE,
      eventName,
      reason: 'Outbox row missing required field: id',
    };
  }

  if (row.aggregate_id == null || String(row.aggregate_id).length === 0) {
    return {
      verdict: VERDICTS.NOT_RECONSTRUCTIBLE,
      eventName,
      reason: 'Outbox row missing required field: aggregate_id',
    };
  }

  if (row.payload === null || row.payload === undefined || typeof row.payload !== 'object') {
    return {
      verdict: VERDICTS.NOT_RECONSTRUCTIBLE,
      eventName,
      reason: 'Outbox row payload is not a usable object',
    };
  }

  try {
    // EventFactory.fromOutbox writes correlation/causation/_eventId/_occurredAt
    // onto the metadata object. Clone the row (and metadata) so the classifier
    // stays side-effect free and never mutates the caller's row.
    eventFactory.fromOutbox({
      ...row,
      metadata: { ...(row.metadata || {}) },
    });
  } catch (err) {
    return {
      verdict: VERDICTS.NOT_RECONSTRUCTIBLE,
      eventName,
      reason: `Reconstruction failed: ${err.message}`,
    };
  }

  return {
    verdict: VERDICTS.SAFE_TO_REPLAY,
    eventName,
    reason: 'EventRegistry constructor exists and EventFactory reconstruction succeeded',
  };
}

module.exports = { classifyFailedRow, VERDICTS };
