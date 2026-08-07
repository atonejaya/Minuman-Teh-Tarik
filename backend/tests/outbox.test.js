'use strict';
const chai = require('chai');
const expect = chai.expect;
const crypto = require('crypto');

const prisma = require('../src/config/database');
const outboxRepository = require('../src/repositories/outbox.repository');
const OutboxRelayWorker = require('../src/workers/outbox.relay.worker');
const InternalMessageBus = require('../src/infrastructure/events/InternalMessageBus');
const NodeEventEmitterAdapter = require('../src/infrastructure/events/NodeEventEmitterAdapter');
const EventDispatcher = require('../src/infrastructure/events/EventDispatcher');
const EventSubscriber = require('../src/infrastructure/events/subscribers/EventSubscriber');
const InvoiceConfirmedEvent = require('../src/domain/events/InvoiceConfirmedEvent');

describe('Transactional Outbox (Sprint 10.2)', () => {
  let eventBus;
  let worker;
  let publishedEvents = [];

  before(async () => {
    // Clean up
    await prisma.outboxEvent.deleteMany({});
  });

  beforeEach(() => {
    publishedEvents = [];
    const adapter = new NodeEventEmitterAdapter();
    const dispatcher = new EventDispatcher();
    eventBus = new InternalMessageBus(adapter, dispatcher);

    class TestSub extends EventSubscriber {
      handles() { return [InvoiceConfirmedEvent]; }
      async handle(event) {
        publishedEvents.push(event);
      }
    }
    eventBus.register(new TestSub());

    // Initialize worker with fast poll interval for tests
    worker = new OutboxRelayWorker(eventBus, {
      pollInterval: 100,
      batchSize: 10,
      retryDelay: 100,
      maxRetry: 2
    });
  });

  afterEach(async () => {
    worker.stop();
    await prisma.outboxEvent.deleteMany({});
  });

  it('should insert outbox event within transaction', async () => {
    const aggregateId = crypto.randomUUID();
    const event = new InvoiceConfirmedEvent(aggregateId, { total: 100 });

    await prisma.$transaction(async (tx) => {
      await outboxRepository.insert(event, tx);
    });

    const records = await outboxRepository.findPending(10);
    expect(records.length).to.equal(1);
    expect(records[0].event_name).to.equal('InvoiceConfirmedEvent');
    expect(records[0].status).to.equal('PENDING');
    expect(records[0].aggregate_id).to.equal(aggregateId);
  });

  it('should process pending events and mark as PUBLISHED', (done) => {
    const aggregateId = crypto.randomUUID();
    const event = new InvoiceConfirmedEvent(aggregateId, { total: 200 });

    prisma.$transaction(async (tx) => {
      await outboxRepository.insert(event, tx);
    }).then(() => {
      worker.start();
      
      // Wait for poll
      setTimeout(async () => {
        try {
          expect(publishedEvents.length).to.equal(1);
          expect(publishedEvents[0].aggregateId).to.equal(aggregateId);

          const dbRecord = await prisma.outboxEvent.findUnique({ where: { id: event.eventId } });
          expect(dbRecord.status).to.equal('PUBLISHED');
          expect(dbRecord.published_by).to.be.a('string');
          expect(dbRecord.processing_started_at).to.be.a('date');

          worker.stop();
          done();
        } catch (e) {
          done(e);
        }
      }, 3000);
    }).catch(done);
  });

  it('should rollback outbox insert if transaction fails', async () => {
    const aggregateId = crypto.randomUUID();
    const event = new InvoiceConfirmedEvent(aggregateId, { total: 300 });

    try {
      await prisma.$transaction(async (tx) => {
        await outboxRepository.insert(event, tx);
        throw new Error('Transaction aborted');
      });
    } catch (e) {
      // Expected
    }

    const records = await outboxRepository.findPending(10);
    expect(records.length).to.equal(0);
  });
});
