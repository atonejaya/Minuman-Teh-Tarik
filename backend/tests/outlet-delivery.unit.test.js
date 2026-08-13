const { expect } = require('chai');
const OutletDelivery = require('../src/modules/outlet-inventory/domain/entities/OutletDelivery');
const MovementType = require('../src/modules/outlet-inventory/domain/value-objects/MovementType');
const { OutletDeliveryStatus, RETRYABLE_STATUSES } = require('../src/modules/outlet-inventory/domain/constants/OutletDeliveryStatus');

describe('Sprint 11.1A - OutletDelivery entity', () => {
  it('builds a valid prisma payload (camelCase items -> snake_case)', () => {
    const entity = new OutletDelivery({
      warungId: 1,
      deliveryDate: '2026-08-07T00:00:00.000Z',
      referenceType: 'SALES_VISIT',
      referenceId: 42,
      performedBy: 7,
      notes: 'drop 10 pcs',
      items: [{ productId: 2, quantity: 5 }]
    });
    expect(entity.toPrisma()).to.deep.include({
      warung_id: 1,
      reference_type: 'SALES_VISIT',
      reference_id: '42',
      notes: 'drop 10 pcs',
      performed_by: 7
    });
    expect(entity.toPrisma().items).to.deep.include({ product_id: 2, quantity: 5 });
  });

  it('rejects empty items', () => {
    expect(() => new OutletDelivery({ warungId: 1, referenceType: 'X', referenceId: '1', items: [] })).to.throw();
  });

  it('rejects duplicate product ids', () => {
    expect(() => new OutletDelivery({
      warungId: 1,
      referenceType: 'X',
      referenceId: '1',
      items: [{ productId: 2, quantity: 5 }, { productId: 2, quantity: 3 }]
    })).to.throw(/terduplikasi/);
  });

  it('rejects quantity <= 0 or non-integer', () => {
    expect(() => new OutletDelivery({ warungId: 1, referenceType: 'X', referenceId: '1', items: [{ productId: 2, quantity: 0 }] })).to.throw();
    expect(() => new OutletDelivery({ warungId: 1, referenceType: 'X', referenceId: '1', items: [{ productId: 2, quantity: -3 }] })).to.throw();
    expect(() => new OutletDelivery({ warungId: 1, referenceType: 'X', referenceId: '1', items: [{ productId: 2, quantity: 1.5 }] })).to.throw();
  });

  it('rejects missing reference_type or reference_id', () => {
    expect(() => new OutletDelivery({ warungId: 1, referenceId: '1', items: [{ productId: 2, quantity: 5 }] })).to.throw();
    expect(() => new OutletDelivery({ warungId: 1, referenceType: 'X', items: [{ productId: 2, quantity: 5 }] })).to.throw();
  });

  it('rejects invalid warung', () => {
    expect(() => new OutletDelivery({ referenceType: 'X', referenceId: '1', items: [{ productId: 2, quantity: 5 }] })).to.throw();
  });
});

describe('Sprint 11.1A - OutletDeliveryStatus constants', () => {
  it('exposes PENDING/POSTED/FAILED and retryable set', () => {
    expect(OutletDeliveryStatus).to.deep.equal({ PENDING: 'PENDING', POSTED: 'POSTED', FAILED: 'FAILED' });
    expect(RETRYABLE_STATUSES).to.include.members([OutletDeliveryStatus.PENDING, OutletDeliveryStatus.FAILED]);
    expect(RETRYABLE_STATUSES).to.not.include(OutletDeliveryStatus.POSTED);
  });
});

describe('Sprint 11.1A - MovementType ISSUE_TO_OUTLET', () => {
  it('is defined as a valid outlet movement', () => {
    expect(MovementType.ISSUE_TO_OUTLET).to.equal('ISSUE_TO_OUTLET');
  });
});
