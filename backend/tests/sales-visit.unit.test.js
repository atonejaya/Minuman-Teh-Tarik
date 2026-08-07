const { expect } = require('chai');
const SalesVisit = require('../src/modules/sales-visit/domain/entities/SalesVisit');
const VisitValidationService = require('../src/modules/sales-visit/domain/services/VisitValidationService');
const VisitTimelineService = require('../src/modules/sales-visit/domain/services/VisitTimelineService');
const { VisitStatus, VisitTransitions, TERMINAL_STATUSES } = require('../src/modules/sales-visit/domain/constants/VisitStatus');
const { VisitActivityType } = require('../src/modules/sales-visit/domain/constants/VisitActivityType');
const { ConflictError, ValidationError } = require('../src/exceptions/api-error');

describe('Sprint 11.0E - SalesVisit entity', () => {
  it('builds a valid visit in PLANNED state', () => {
    const entity = new SalesVisit({ salesId: 1, warungId: 2, visitDate: '2026-08-10T00:00:00Z' });
    expect(entity.status).to.equal(VisitStatus.PLANNED);
    expect(entity.toPrisma()).to.deep.include({ sales_id: 1, warung_id: 2 });
  });

  it('normalizes visit_date to UTC start of day', () => {
    const entity = new SalesVisit({ salesId: 1, warungId: 2, visitDate: '2026-08-10T15:30:00Z' });
    const date = entity.toPrisma().visit_date;
    expect(date.toISOString()).to.equal('2026-08-10T00:00:00.000Z');
  });

  it('accepts optional fields', () => {
    const entity = new SalesVisit({ salesId: 1, warungId: 2, plannedSequence: 3, openingNote: 'first visit' });
    expect(entity.plannedSequence).to.equal(3);
    expect(entity.openingNote).to.equal('first visit');
  });

  it('rejects missing warung_id', () => {
    expect(() => new SalesVisit({ salesId: 1 })).to.throw(ValidationError);
  });

  it('rejects invalid visit_date', () => {
    expect(() => new SalesVisit({ salesId: 1, warungId: 2, visitDate: 'not-a-date' })).to.throw(ValidationError);
  });

  it('rejects negative planned_sequence', () => {
    expect(() => new SalesVisit({ salesId: 1, warungId: 2, plannedSequence: -1 })).to.throw(ValidationError);
  });
});

describe('Sprint 11.0E - VisitStatus constants', () => {
  it('exposes the full lifecycle', () => {
    expect(VisitStatus).to.deep.include({
      PLANNED: 'PLANNED',
      CHECKED_IN: 'CHECKED_IN',
      STOCK_COUNTED: 'STOCK_COUNTED',
      ORDER_CREATED: 'ORDER_CREATED',
      DELIVERED: 'DELIVERED',
      CHECKED_OUT: 'CHECKED_OUT',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED'
    });
  });

  it('marks COMPLETED and CANCELLED as terminal', () => {
    expect(TERMINAL_STATUSES).to.include.members([VisitStatus.COMPLETED, VisitStatus.CANCELLED]);
  });

  it('describes the documented transition table', () => {
    expect(VisitTransitions[VisitStatus.PLANNED]).to.include(VisitStatus.CHECKED_IN);
    expect(VisitTransitions[VisitStatus.PLANNED]).to.include(VisitStatus.CANCELLED);
    expect(VisitTransitions[VisitStatus.CHECKED_IN]).to.include(VisitStatus.STOCK_COUNTED);
    expect(VisitTransitions[VisitStatus.CHECKED_IN]).to.include(VisitStatus.ORDER_CREATED);
    expect(VisitTransitions[VisitStatus.CHECKED_IN]).to.include(VisitStatus.DELIVERED);
    expect(VisitTransitions[VisitStatus.CHECKED_IN]).to.include(VisitStatus.CHECKED_OUT);
    expect(VisitTransitions[VisitStatus.STOCK_COUNTED]).to.include(VisitStatus.ORDER_CREATED);
    expect(VisitTransitions[VisitStatus.STOCK_COUNTED]).to.include(VisitStatus.DELIVERED);
    expect(VisitTransitions[VisitStatus.STOCK_COUNTED]).to.include(VisitStatus.CHECKED_OUT);
    expect(VisitTransitions[VisitStatus.ORDER_CREATED]).to.include(VisitStatus.DELIVERED);
    expect(VisitTransitions[VisitStatus.ORDER_CREATED]).to.include(VisitStatus.CHECKED_OUT);
    expect(VisitTransitions[VisitStatus.DELIVERED]).to.include(VisitStatus.CHECKED_OUT);
    expect(VisitTransitions[VisitStatus.CHECKED_OUT]).to.include(VisitStatus.COMPLETED);
    expect(VisitTransitions[VisitStatus.COMPLETED]).to.deep.equal([]);
    expect(VisitTransitions[VisitStatus.CANCELLED]).to.deep.equal([]);
  });
});

describe('Sprint 11.0E - VisitActivityType constants', () => {
  it('exposes all timeline activity types', () => {
    expect(VisitActivityType).to.include.keys([
      'VISIT_CREATED', 'CHECK_IN', 'STOCK_COUNT', 'ORDER_CREATED',
      'DELIVERED', 'CHECK_OUT', 'COMPLETED', 'NOTE_ADDED', 'PHOTO_ADDED', 'CANCELLED'
    ]);
  });
});

describe('Sprint 11.0E - VisitValidationService (state machine)', () => {
  it('allows the happy path PLANNED -> CHECKED_IN -> STOCK_COUNTED -> DELIVERED -> CHECKED_OUT -> COMPLETED', () => {
    let visit = { status: VisitStatus.PLANNED };
    VisitValidationService.assertCanCheckIn(visit, { latitude: -6.2, longitude: 106.8 });
    visit = { status: VisitStatus.CHECKED_IN };
    VisitValidationService.assertCanRecordStockCount(visit);
    visit = { status: VisitStatus.STOCK_COUNTED };
    VisitValidationService.assertCanRecordDelivery(visit);
    visit = { status: VisitStatus.DELIVERED };
    VisitValidationService.assertCanCheckOut(visit);
    visit = { status: VisitStatus.CHECKED_OUT };
    VisitValidationService.assertCanComplete(visit);
  });

  it('rejects check-in without GPS', () => {
    expect(() => VisitValidationService.assertCanCheckIn({ status: VisitStatus.PLANNED }, {})).to.throw(ValidationError);
    expect(() => VisitValidationService.assertCanCheckIn({ status: VisitStatus.PLANNED }, { latitude: 'x', longitude: 1 })).to.throw(ValidationError);
  });

  it('rejects check-in when already checked in', () => {
    expect(() => VisitValidationService.assertCanCheckIn({ status: VisitStatus.CHECKED_IN }, { latitude: -6.2, longitude: 106.8 }))
      .to.throw(ConflictError);
  });

  it('rejects stock count before check-in', () => {
    expect(() => VisitValidationService.assertCanRecordStockCount({ status: VisitStatus.PLANNED })).to.throw(ConflictError);
  });

  it('rejects duplicate stock count', () => {
    expect(() => VisitValidationService.assertCanRecordStockCount({ status: VisitStatus.STOCK_COUNTED })).to.throw(ConflictError);
  });

  it('rejects order from PLANNED or after delivery', () => {
    expect(() => VisitValidationService.assertCanRecordOrder({ status: VisitStatus.PLANNED })).to.throw(ConflictError);
    expect(() => VisitValidationService.assertCanRecordOrder({ status: VisitStatus.DELIVERED })).to.throw(ConflictError);
  });

  it('rejects delivery before check-in', () => {
    expect(() => VisitValidationService.assertCanRecordDelivery({ status: VisitStatus.PLANNED })).to.throw(ConflictError);
  });

  it('rejects check-out before check-in and after completion', () => {
    expect(() => VisitValidationService.assertCanCheckOut({ status: VisitStatus.PLANNED })).to.throw(ConflictError);
    expect(() => VisitValidationService.assertCanCheckOut({ status: VisitStatus.COMPLETED })).to.throw(ConflictError);
  });

  it('rejects complete unless checked out', () => {
    expect(() => VisitValidationService.assertCanComplete({ status: VisitStatus.CHECKED_IN })).to.throw(ConflictError);
    expect(() => VisitValidationService.assertCanComplete({ status: VisitStatus.COMPLETED })).to.throw(ConflictError);
  });

  it('rejects cancel once field activity started', () => {
    expect(() => VisitValidationService.assertCanCancel({ status: VisitStatus.CHECKED_IN })).to.throw(ConflictError);
  });

  it('rejects notes/photos on terminal visits', () => {
    expect(() => VisitValidationService.assertVisitActive({ status: VisitStatus.COMPLETED })).to.throw(ConflictError);
    expect(() => VisitValidationService.assertVisitActive({ status: VisitStatus.CANCELLED })).to.throw(ConflictError);
    expect(() => VisitValidationService.assertVisitActive({ status: VisitStatus.CHECKED_IN })).to.not.throw();
  });
});

describe('Sprint 11.0E - VisitTimelineService', () => {
  it('sorts activities chronologically', () => {
    const activities = [
      { id: 3, occurred_at: '2026-08-10T10:00:00Z' },
      { id: 1, occurred_at: '2026-08-10T08:00:00Z' },
      { id: 2, occurred_at: '2026-08-10T09:00:00Z' }
    ];
    const sorted = VisitTimelineService.buildTimeline(activities);
    expect(sorted.map(a => a.id)).to.deep.equal([1, 2, 3]);
  });

  it('uses id as tie-breaker for identical timestamps', () => {
    const activities = [
      { id: 2, occurred_at: '2026-08-10T08:00:00Z' },
      { id: 1, occurred_at: '2026-08-10T08:00:00Z' }
    ];
    const sorted = VisitTimelineService.buildTimeline(activities);
    expect(sorted.map(a => a.id)).to.deep.equal([1, 2]);
  });

  it('does not mutate the source array', () => {
    const activities = [{ id: 2, occurred_at: '2026-08-10T08:00:00Z' }, { id: 1, occurred_at: '2026-08-10T07:00:00Z' }];
    VisitTimelineService.buildTimeline(activities);
    expect(activities.map(a => a.id)).to.deep.equal([2, 1]);
  });

  it('computes duration in whole seconds', () => {
    const start = new Date('2026-08-10T08:00:00Z');
    const end = new Date('2026-08-10T08:01:30Z');
    expect(VisitTimelineService.computeDuration(start, end)).to.equal(90);
  });

  it('returns null when check-in or check-out is missing', () => {
    expect(VisitTimelineService.computeDuration(null, new Date())).to.equal(null);
    expect(VisitTimelineService.computeDuration(new Date(), null)).to.equal(null);
  });

  it('returns zero for backwards clocks instead of negative', () => {
    const start = new Date('2026-08-10T08:00:00Z');
    const end = new Date('2026-08-10T07:00:00Z');
    expect(VisitTimelineService.computeDuration(start, end)).to.equal(0);
  });
});
