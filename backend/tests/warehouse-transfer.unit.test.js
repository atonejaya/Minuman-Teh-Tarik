const { expect } = require('chai');
const WarehouseTransfer = require('../src/modules/warehouse/domain/entities/WarehouseTransfer');
const SalesDay = require('../src/modules/warehouse/domain/entities/SalesDay');
const { WarehouseTransferStatus, RETRYABLE_STATUSES } = require('../src/modules/warehouse/domain/constants/WarehouseTransferStatus');
const { WarehouseTransferType } = require('../src/modules/warehouse/domain/constants/WarehouseTransferType');
const { WarehouseMovementType } = require('../src/modules/warehouse/domain/constants/WarehouseMovementType');
const { SalesDayStatus } = require('../src/modules/warehouse/domain/constants/SalesDayStatus');

describe('Sprint 11.2A - WarehouseTransfer entity', () => {
  it('builds a valid prisma payload for ISSUE (batch_id optional)', () => {
    const entity = new WarehouseTransfer({
      type: 'issue',
      warehouseId: 4,
      salesId: 9,
      transactionDate: '2026-08-07T00:00:00.000Z',
      referenceType: 'SALES_STOCK',
      referenceId: 'ISS-001',
      performedBy: 7,
      notes: 'issue 10 pcs',
      items: [{ productId: 12, qty: 10 }]
    });
    expect(entity.type).to.equal('ISSUE');
    expect(entity.toPrisma()).to.deep.include({
      warehouse_id: 4,
      sales_id: 9,
      reference_type: 'SALES_STOCK',
      reference_id: 'ISS-001',
      notes: 'issue 10 pcs',
      created_by: 7
    });
    expect(entity.toPrisma().items).to.deep.include({ product_id: 12, qty: 10, batch_id: null });
  });

  it('builds a valid prisma payload for RETURN (batch_id wajib)', () => {
    const entity = new WarehouseTransfer({
      type: 'RETURN',
      warehouseId: 4,
      salesId: 9,
      referenceType: 'SALES_STOCK',
      referenceId: 'RET-001',
      items: [{ productId: 12, qty: 3, batchId: 12 }]
    });
    expect(entity.toPrisma().items).to.deep.include({ product_id: 12, qty: 3, batch_id: 12 });
  });

  it('rejects invalid type', () => {
    expect(() => new WarehouseTransfer({ type: 'FOO', warehouseId: 4, salesId: 9, referenceType: 'X', referenceId: '1', items: [{ productId: 12, qty: 1 }] })).to.throw(/ISSUE atau RETURN/);
  });

  it('rejects empty items', () => {
    expect(() => new WarehouseTransfer({ type: 'ISSUE', warehouseId: 4, salesId: 9, referenceType: 'X', referenceId: '1', items: [] })).to.throw();
  });

  it('rejects duplicate product ids', () => {
    expect(() => new WarehouseTransfer({
      type: 'ISSUE',
      warehouseId: 4,
      salesId: 9,
      referenceType: 'X',
      referenceId: '1',
      items: [{ productId: 12, qty: 5 }, { productId: 12, qty: 3 }]
    })).to.throw(/terduplikasi/);
  });

  it('rejects qty <= 0 or non-integer', () => {
    expect(() => new WarehouseTransfer({ type: 'ISSUE', warehouseId: 4, salesId: 9, referenceType: 'X', referenceId: '1', items: [{ productId: 12, qty: 0 }] })).to.throw();
    expect(() => new WarehouseTransfer({ type: 'ISSUE', warehouseId: 4, salesId: 9, referenceType: 'X', referenceId: '1', items: [{ productId: 12, qty: -3 }] })).to.throw();
    expect(() => new WarehouseTransfer({ type: 'ISSUE', warehouseId: 4, salesId: 9, referenceType: 'X', referenceId: '1', items: [{ productId: 12, qty: 1.5 }] })).to.throw();
  });

  it('requires batch_id for RETURN items', () => {
    expect(() => new WarehouseTransfer({
      type: 'RETURN',
      warehouseId: 4,
      salesId: 9,
      referenceType: 'X',
      referenceId: '1',
      items: [{ productId: 12, qty: 3 }]
    })).to.throw(/batch_id wajib/);
  });

  it('rejects missing reference_type or reference_id', () => {
    expect(() => new WarehouseTransfer({ type: 'ISSUE', warehouseId: 4, salesId: 9, referenceId: '1', items: [{ productId: 12, qty: 1 }] })).to.throw();
    expect(() => new WarehouseTransfer({ type: 'ISSUE', warehouseId: 4, salesId: 9, referenceType: 'X', items: [{ productId: 12, qty: 1 }] })).to.throw();
  });
});

describe('Sprint 11.2A - SalesDay entity', () => {
  it('validates sales_id & sales_date', () => {
    const entity = new SalesDay({ salesId: 9, salesDate: '2026-08-07T00:00:00.000Z' });
    expect(entity.salesId).to.equal(9);
    expect(() => new SalesDay({ salesDate: '2026-08-07T00:00:00.000Z' })).to.throw(/sales_id/);
    expect(() => new SalesDay({ salesId: 9, salesDate: 'not-a-date' })).to.throw(/sales_date/);
  });
});

describe('Sprint 11.2A - constants', () => {
  it('exposes WarehouseTransferStatus PENDING/POSTED/FAILED and retryable set', () => {
    expect(WarehouseTransferStatus).to.deep.equal({ PENDING: 'PENDING', POSTED: 'POSTED', FAILED: 'FAILED' });
    expect(RETRYABLE_STATUSES).to.include.members([WarehouseTransferStatus.PENDING, WarehouseTransferStatus.FAILED]);
    expect(RETRYABLE_STATUSES).to.not.include(WarehouseTransferStatus.POSTED);
  });

  it('exposes transfer & movement types and SalesDay status', () => {
    expect(WarehouseTransferType).to.deep.equal({ ISSUE: 'ISSUE', RETURN: 'RETURN' });
    expect(WarehouseMovementType).to.deep.equal({ ISSUE_TO_SALES: 'ISSUE_TO_SALES', RETURN_FROM_SALES: 'RETURN_FROM_SALES' });
    expect(SalesDayStatus).to.deep.equal({ OPEN: 'OPEN', CLOSED: 'CLOSED' });
  });
});
