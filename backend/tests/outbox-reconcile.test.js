'use strict';
const chai = require('chai');
const expect = chai.expect;

const {
  classifyFailedRow,
  VERDICTS,
} = require('../src/infrastructure/events/reconciliation/outboxRowClassifier');
const EventFactory = require('../src/infrastructure/events/factory/EventFactory');
const EventRegistry = require('../src/infrastructure/events/registry/EventRegistry');
const InternalMessageBus = require('../src/infrastructure/events/InternalMessageBus');
const buildEventBus = require('../src/infrastructure/events/event-bus');

function makeRow(overrides = {}) {
  return {
    id: 'outbox-0001',
    event_name: 'CustomerCreatedEvent',
    aggregate_id: '56',
    aggregate_type: 'Customer',
    event_version: 1,
    correlation_id: '56',
    causation_id: '56',
    payload: { id: 56, name: 'Warung Test' },
    metadata: { created_by: 1 },
    occurred_at: '2026-08-07T01:02:27.000Z',
    status: 'FAILED',
    retry_count: 3,
    next_retry_at: null,
    ...overrides,
  };
}

describe('Outbox Reconciliation (Gate 2B.11)', () => {
  describe('classifyFailedRow', () => {
    it('classifies a registered reconstructible row as SAFE_TO_REPLAY', () => {
      const result = classifyFailedRow(makeRow(), EventRegistry, EventFactory);
      expect(result.verdict).to.equal(VERDICTS.SAFE_TO_REPLAY);
      expect(result.eventName).to.equal('CustomerCreatedEvent');
      expect(result.reason).to.include('reconstruction succeeded');
    });

    it('classifies a reconstructible Product/Price row as SAFE_TO_REPLAY', () => {
      const row = makeRow({
        event_name: 'ProductCreated',
        aggregate_type: 'Product',
        payload: { id: 1, code: 'PRD-000001', name: 'Es Teh 220ml' },
      });
      const result = classifyFailedRow(row, EventRegistry, EventFactory);
      expect(result.verdict).to.equal(VERDICTS.SAFE_TO_REPLAY);
      expect(result.eventName).to.equal('ProductCreated');
    });

    it('classifies an unknown event name as UNREGISTERED', () => {
      const result = classifyFailedRow(makeRow({ event_name: 'NeverRegisteredEvent' }), EventRegistry, EventFactory);
      expect(result.verdict).to.equal(VERDICTS.UNREGISTERED);
      expect(result.reason).to.include("No EventRegistry constructor for 'NeverRegisteredEvent'");
    });

    it('classifies a row with missing id as NOT_RECONSTRUCTIBLE', () => {
      const result = classifyFailedRow(makeRow({ id: '' }), EventRegistry, EventFactory);
      expect(result.verdict).to.equal(VERDICTS.NOT_RECONSTRUCTIBLE);
      expect(result.reason).to.include('id');
    });

    it('classifies a row with missing aggregate_id as NOT_RECONSTRUCTIBLE', () => {
      const result = classifyFailedRow(makeRow({ aggregate_id: null }), EventRegistry, EventFactory);
      expect(result.verdict).to.equal(VERDICTS.NOT_RECONSTRUCTIBLE);
      expect(result.reason).to.include('aggregate_id');
    });

    it('classifies a row with null payload as NOT_RECONSTRUCTIBLE', () => {
      const result = classifyFailedRow(makeRow({ payload: null }), EventRegistry, EventFactory);
      expect(result.verdict).to.equal(VERDICTS.NOT_RECONSTRUCTIBLE);
      expect(result.reason).to.include('payload');
    });

    it('classifies a registered row whose reconstruction throws as NOT_RECONSTRUCTIBLE', () => {
      const throwingFactory = {
        fromOutbox() {
          throw new Error('payload shape incompatible: boom');
        },
      };
      const result = classifyFailedRow(makeRow({ event_name: 'ThrowingEvent' }), { ThrowingEvent: class ThrowingEvent {} }, throwingFactory);
      expect(result.verdict).to.equal(VERDICTS.NOT_RECONSTRUCTIBLE);
      expect(result.reason).to.include('boom');
    });

    it('is deterministic and side-effect free', () => {
      const row = makeRow();
      const first = classifyFailedRow(row, EventRegistry, EventFactory);
      const second = classifyFailedRow(row, EventRegistry, EventFactory);
      expect(first).to.deep.equal(second);
      expect(row).to.deep.equal(makeRow());
    });
  });

  describe('buildEventBus', () => {
    it('returns a fresh InternalMessageBus with the exact production subscriber set in order', () => {
      const bus = buildEventBus();
      expect(bus).to.be.instanceOf(InternalMessageBus);
      const names = [...bus.subscribers].map((s) => s.constructor.name);
      expect(names).to.deep.equal([
        'AuditSubscriber',
        'SalesSummaryProjector',
        'CustomerLedgerProjector',
        'ProductSalesProjector',
        'SalesPerformanceProjector',
        'SalesStockProjector',
        'OutletInventoryProjector',
      ]);
    });

    it('builds independent instances on every call', () => {
      const first = buildEventBus();
      const second = buildEventBus();
      expect(first).to.not.equal(second);
      expect([...first.subscribers]).to.have.length(7);
      expect([...second.subscribers]).to.have.length(7);
    });
  });
});
