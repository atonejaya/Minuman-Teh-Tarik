'use strict';
const chai = require('chai');
const expect = chai.expect;
const crypto = require('crypto');

const DomainEvent = require('../src/domain/events/DomainEvent');
const InternalMessageBus = require('../src/infrastructure/events/InternalMessageBus');
const NodeEventEmitterAdapter = require('../src/infrastructure/events/NodeEventEmitterAdapter');
const EventDispatcher = require('../src/infrastructure/events/EventDispatcher');
const EventSubscriber = require('../src/infrastructure/events/subscribers/EventSubscriber');
const InvoiceConfirmedEvent = require('../src/domain/events/InvoiceConfirmedEvent');

describe('Domain Event Infrastructure (Sprint 10.1)', () => {
  let bus;
  let dispatcher;
  let adapter;

  beforeEach(() => {
    adapter = new NodeEventEmitterAdapter();
    dispatcher = new EventDispatcher();
    bus = new InternalMessageBus(adapter, dispatcher);
  });

  describe('1. DomainEvent Immutability & Contract', () => {
    it('should create valid event with correct properties', () => {
      const payload = { amount: 1000 };
      const event = new InvoiceConfirmedEvent(1, payload, { userId: 5 });

      expect(event.eventId).to.be.a('string');
      expect(event.eventName).to.equal('InvoiceConfirmedEvent');
      expect(event.aggregateId).to.equal(1);
      expect(event.aggregateType).to.equal('SalesTransaction');
      expect(event.occurredAt).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(event.correlationId).to.be.a('string');
      expect(event.version).to.equal(1);
      expect(event.metadata.userId).to.equal(5);
      expect(event.payload).to.deep.equal(payload);
    });

    it('should be deeply immutable', () => {
      const payload = { nested: { value: 1 } };
      const event = new InvoiceConfirmedEvent(1, payload);

      // Attempt modifications
      expect(() => { event.eventName = 'HackedEvent'; }).to.throw();
      expect(() => { event.payload.nested.value = 2; }).to.throw();
      
      expect(event.eventName).to.equal('InvoiceConfirmedEvent');
      expect(event.payload.nested.value).to.equal(1);
    });

    it('should enforce naming convention', () => {
      class BadEventName extends DomainEvent {
        constructor() { super(1, 'Test', {}); }
      }
      expect(() => new BadEventName()).to.throw("Event name 'BadEventName' must end with 'Event'");
    });
  });

  describe('2. InternalMessageBus & Dispatcher', () => {
    it('should publish single event and be handled by subscriber', (done) => {
      class TestSubscriber extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) {
          try {
            expect(event.aggregateId).to.equal(99);
            done();
          } catch (e) {
            done(e);
          }
        }
      }

      bus.register(new TestSubscriber());
      bus.publish(new InvoiceConfirmedEvent(99, {}));
    });

    it('should allow multiple subscribers for the same event', (done) => {
      let count = 0;
      const checkDone = () => {
        count++;
        if (count === 2) done();
      };

      class Sub1 extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) { checkDone(); }
      }
      
      class Sub2 extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) { checkDone(); }
      }

      bus.register(new Sub1());
      bus.register(new Sub2());

      bus.publish(new InvoiceConfirmedEvent(100, {}));
    });

    it('should isolate errors (failing subscriber does not stop others)', (done) => {
      let sub2Called = false;

      class FailingSub extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) {
          throw new Error('I crashed!');
        }
      }

      class WorkingSub extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) {
          sub2Called = true;
        }
      }

      bus.register(new FailingSub());
      bus.register(new WorkingSub());

      bus.publish(new InvoiceConfirmedEvent(101, {}));

      // Wait a bit for async dispatch to finish
      setTimeout(() => {
        try {
          expect(sub2Called).to.be.true;
          done();
        } catch(e) { done(e); }
      }, 50);
    });

    it('should reject duplicate subscriber registration', () => {
      class Sub extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) {}
      }
      const subInstance = new Sub();
      bus.register(subInstance);

      expect(() => bus.register(subInstance)).to.throw(/Subscriber already registered/);
    });

    it('should successfully publishMany sequentially via adapter', (done) => {
      let receivedCount = 0;

      class CountSub extends EventSubscriber {
        handles() { return [InvoiceConfirmedEvent]; }
        async handle(event) {
          receivedCount++;
          if (receivedCount === 3) done();
        }
      }

      bus.register(new CountSub());

      const events = [
        new InvoiceConfirmedEvent(1, {}),
        new InvoiceConfirmedEvent(2, {}),
        new InvoiceConfirmedEvent(3, {})
      ];

      bus.publishMany(events).catch(done);
    });
  });
});
