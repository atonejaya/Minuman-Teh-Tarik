const { expect } = require('chai');
const AutoSalesEngine = require('../src/modules/outlet-inventory/domain/services/AutoSalesEngine');
const AutoRefillEngine = require('../src/modules/outlet-inventory/domain/services/AutoRefillEngine');
const OutletParStock = require('../src/modules/outlet-inventory/domain/entities/OutletParStock');
const MovementType = require('../src/modules/outlet-inventory/domain/value-objects/MovementType');

describe('Sprint 11.0D - AutoSalesEngine (Domain Service)', () => {
  it('computes sales = current balance - physical count', () => {
    const result = AutoSalesEngine.calculate({ currentBalance: 10, physicalQty: 3 });
    expect(result.calculatedSales).to.equal(7);
    expect(result.ledgerEntry.movementType).to.equal(MovementType.SALE);
    expect(result.ledgerEntry.qtyBefore).to.equal(10);
    expect(result.ledgerEntry.qtyChange).to.equal(-7);
    expect(result.ledgerEntry.qtyAfter).to.equal(3);
  });

  it('clamps sales at zero when physical count exceeds balance', () => {
    const result = AutoSalesEngine.calculate({ currentBalance: 2, physicalQty: 5 });
    expect(result.calculatedSales).to.equal(0);
    expect(result.ledgerEntry.qtyChange).to.equal(0);
    expect(result.ledgerEntry.qtyAfter).to.equal(5);
  });

  it('handles zero stock', () => {
    const result = AutoSalesEngine.calculate({ currentBalance: 0, physicalQty: 0 });
    expect(result.calculatedSales).to.equal(0);
  });

  it('rejects invalid inputs', () => {
    expect(() => AutoSalesEngine.calculate({ currentBalance: -1, physicalQty: 0 })).to.throw();
    expect(() => AutoSalesEngine.calculate({ currentBalance: 1, physicalQty: 1.5 })).to.throw();
  });
});

describe('Sprint 11.0D - AutoRefillEngine (Domain Service)', () => {
  it('computes required refill = par stock - physical stock', () => {
    const result = AutoRefillEngine.calculate({ parQty: 10, physicalQty: 3 });
    expect(result.requiredRefill).to.equal(7);
  });

  it('returns zero when stock is above par', () => {
    const result = AutoRefillEngine.calculate({ parQty: 10, physicalQty: 12 });
    expect(result.requiredRefill).to.equal(0);
  });

  it('rejects invalid inputs', () => {
    expect(() => AutoRefillEngine.calculate({ parQty: -1, physicalQty: 0 })).to.throw();
  });
});

describe('Sprint 11.0D - OutletParStock entity', () => {
  it('builds a valid prisma payload', () => {
    const entity = new OutletParStock({ warungId: 1, productId: 2, parQty: 10, minQty: 2, maxQty: 12 });
    expect(entity.toPrisma()).to.deep.include({ warung_id: 1, product_id: 2, par_qty: 10, min_qty: 2, max_qty: 12 });
  });

  it('rejects negative par_qty', () => {
    expect(() => new OutletParStock({ warungId: 1, productId: 2, parQty: -1 })).to.throw();
  });

  it('rejects max_qty below min_qty', () => {
    expect(() => new OutletParStock({ warungId: 1, productId: 2, parQty: 5, minQty: 5, maxQty: 3 })).to.throw();
  });
});
