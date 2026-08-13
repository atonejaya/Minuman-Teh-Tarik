const { expect } = require('chai');
const PricingAccessor = require('../src/services/pricing-accessor.service');

describe('G2 - PricingAccessor (ProductPrice contract)', () => {
  const capture = {};
  const fakeTx = {
    productPrice: {
      async findFirst(args) {
        capture.args = args;
        return capture.result;
      }
    }
  };

  beforeEach(() => {
    capture.args = null;
    capture.result = null;
  });

  it('queries ProductPrice with the current schema contract (status + RETAIL level + effective window)', async () => {
    capture.result = { price: { toString: () => '2000.00' }, price_level_id: 1, status: 'ACTIVE' };
    const price = await PricingAccessor.resolveRetailUnitPrice(fakeTx, 42);

    expect(price).to.equal(2000);
    expect(capture.args.where).to.deep.equal({
      product_id: 42,
      status: 'ACTIVE',
      price_level: { code: 'PL-RETAIL', status: 'ACTIVE' },
      OR: [
        { effective_from: null, effective_until: null },
        { effective_from: { lte: capture.args.where.OR[1].effective_from.lte }, effective_until: null },
        { effective_from: null, effective_until: { gte: capture.args.where.OR[2].effective_until.gte } },
        { effective_from: { lte: capture.args.where.OR[3].effective_from.lte }, effective_until: { gte: capture.args.where.OR[3].effective_until.gte } }
      ]
    });
    expect(capture.args.orderBy).to.deep.equal({ created_at: 'desc' });
  });

  it('returns a finite Number unit_price (never undefined) for a valid RETAIL price', async () => {
    capture.result = { price: { toString: () => '2500.00' }, price_level_id: 2, status: 'ACTIVE' };
    const price = await PricingAccessor.resolveRetailUnitPrice(fakeTx, 7);

    expect(price).to.be.a('number');
    expect(Number.isFinite(price)).to.equal(true);
    expect(price).to.equal(2500);
  });

  it('returns null (explicit, no silent fallback) when no active RETAIL ProductPrice exists', async () => {
    capture.result = null;
    const price = await PricingAccessor.resolveRetailUnitPrice(fakeTx, 99);

    expect(price).to.equal(null);
    expect(price).to.not.equal(undefined);
  });

  it('returns null when the only price is INACTIVE or non-RETAIL (no fallback to deleted field)', async () => {
    capture.result = { price: { toString: () => '5000.00' }, status: 'INACTIVE', price_level_id: 1 };
    const inactive = await PricingAccessor.resolveRetailUnitPrice(fakeTx, 5);
    expect(inactive).to.equal(null);
  });
});
