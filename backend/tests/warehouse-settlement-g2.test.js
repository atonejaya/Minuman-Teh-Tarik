const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const prisma = require('../src/config/database');
const jwt = require('jsonwebtoken');

describe('G2 - Warehouse Settlement Pricing Accessor (ProductPrice contract)', () => {
  let pricedToken, missingToken;
  let pricedUser, missingUser;
  let pricedProduct, missingProduct;
  let pricedBatch, missingBatch;
  let warehouseId;
  let createdSettlementId;

  before(async () => {
    const makeUser = async (username) =>
      prisma.user.create({
        data: { username, password_hash: 'x', name: username, role: 'SALES', is_active: true }
      });

    pricedUser = await makeUser('g2_settle_priced');
    missingUser = await makeUser('g2_settle_missing');

    pricedToken = jwt.sign({ sub: pricedUser.id, role: 'SALES' }, process.env.JWT_SECRET || 'secret');
    missingToken = jwt.sign({ sub: missingUser.id, role: 'SALES' }, process.env.JWT_SECRET || 'secret');

    const category = await prisma.productCategory.upsert({
      where: { code: 'CAT-G2-001' }, update: {}, create: { code: 'CAT-G2-001', name: 'MINUMAN' }
    });
    const unit = await prisma.unit.upsert({
      where: { code: 'UNT-G2-001' }, update: {}, create: { code: 'UNT-G2-001', name: 'PCS', symbol: 'pcs' }
    });
    const brand = await prisma.brand.upsert({
      where: { code: 'BRD-G2-001' }, update: {}, create: { code: 'BRD-G2-001', name: 'Brand G2' }
    });
    const packaging = await prisma.packaging.upsert({
      where: { code: 'PKG-G2-001' }, update: {}, create: { code: 'PKG-G2-001', name: 'Bottle' }
    });

    const base = { category_id: category.id, unit_id: unit.id, brand_id: brand.id, packaging_id: packaging.id, is_active: true, shelf_life_days: 30 };

    pricedProduct = await prisma.product.create({ data: { ...base, code: 'PRD-G2-PRICED', name: 'G2 Priced', cost_price: 3000 } });
    missingProduct = await prisma.product.create({ data: { ...base, code: 'PRD-G2-MISSING', name: 'G2 Missing Price', cost_price: 2000 } });

    const retailLevel = await prisma.priceLevel.findFirst({ where: { code: 'PL-RETAIL' } });
    await prisma.productPrice.create({
      data: { product_id: pricedProduct.id, price_level_id: retailLevel.id, price: 5000, status: 'ACTIVE' }
    });

    const makeBatch = (productId, suffix) =>
      prisma.productBatch.create({
        data: { product_id: productId, batch_number: `BCH-G2-${suffix}`, production_date: new Date(), expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      });

    pricedBatch = await makeBatch(pricedProduct.id, 'A');
    missingBatch = await makeBatch(missingProduct.id, 'B');

    await prisma.mobileStock.create({
      data: { sales_id: pricedUser.id, product_id: pricedProduct.id, batch_id: pricedBatch.id, qty_available: 12, condition: 'GOOD', version: 1 }
    });
    await prisma.mobileStock.create({
      data: { sales_id: missingUser.id, product_id: missingProduct.id, batch_id: missingBatch.id, qty_available: 5, condition: 'GOOD', version: 1 }
    });

    warehouseId = (await prisma.warehouse.findFirst()).id;
  });

  after(async () => {
    if (createdSettlementId) {
      await prisma.settlementDifference.deleteMany({ where: { warehouse_settlement_id: createdSettlementId } });
      await prisma.warehouseSettlementItem.deleteMany({ where: { warehouse_settlement_id: createdSettlementId } });
      await prisma.warehouseSettlement.deleteMany({ where: { id: createdSettlementId } });
    }
    await prisma.mobileStock.deleteMany({ where: { sales_id: { in: [pricedUser?.id, missingUser?.id].filter(Boolean) } } });
    if (pricedBatch) await prisma.productBatch.deleteMany({ where: { id: pricedBatch.id } });
    if (missingBatch) await prisma.productBatch.deleteMany({ where: { id: missingBatch.id } });
    if (pricedProduct) await prisma.product.deleteMany({ where: { id: pricedProduct.id } });
    if (missingProduct) await prisma.product.deleteMany({ where: { id: missingProduct.id } });
    await prisma.auditLog.deleteMany({ where: { user_id: { in: [pricedUser?.id, missingUser?.id].filter(Boolean) } } });
    if (pricedUser) await prisma.user.deleteMany({ where: { id: pricedUser.id } });
    if (missingUser) await prisma.user.deleteMany({ where: { id: missingUser.id } });
  });

  it('uses valid RETAIL ProductPrice as unit_price and computes inventory_value correctly', async () => {
    const res = await request(app)
      .post('/api/v1/settlements')
      .set('Authorization', `Bearer ${pricedToken}`)
      .send({ warehouse_id: warehouseId });

    expect(res.status).to.equal(201);
    expect(res.body.data.items).to.have.length(1);

    const item = res.body.data.items[0];
    expect(item.unit_price).to.not.equal(undefined);
    expect(item.unit_price).to.not.equal(null);
    expect(Number(item.unit_price)).to.equal(5000);
    expect(Number(item.inventory_value)).to.equal(5000 * 12);
    expect(Number.isNaN(Number(item.inventory_value))).to.equal(false);

    const persisted = await prisma.warehouseSettlementItem.findUnique({ where: { id: item.id } });
    expect(Number(persisted.unit_price)).to.equal(5000);
    expect(Number(persisted.inventory_value)).to.equal(60000);

    createdSettlementId = res.body.data.id;
  });

  it('explicitly rejects settlement when no active RETAIL ProductPrice exists (no silent fallback)', async () => {
    const res = await request(app)
      .post('/api/v1/settlements')
      .set('Authorization', `Bearer ${missingToken}`)
      .send({ warehouse_id: warehouseId });

    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('PRICE_NOT_FOUND');
  });
});
