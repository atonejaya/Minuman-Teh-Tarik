const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');
const ProductService = require('../src/modules/master/product/services/ProductService');
const prisma = require('../src/config/database');

describe('Product Master Data API', () => {
  let token;
  let originalFindUnique;
  let originalGetAllProducts;
  let originalSearchProducts;
  let originalGetProductById;
  let originalCreateProduct;
  let originalUpdateProduct;
  let originalUpdateProductStatus;

  before(() => {
    // Generate dummy token
    token = jwt.sign({ sub: 1, role: 'OWNER' }, jwtConfig.SECRET || 'dummy-secret');

    // Mock Prisma for Auth Middleware
    originalFindUnique = prisma.user.findUnique;
    prisma.user.findUnique = async (args) => {
      if (args.where && args.where.id === 1) {
        return { id: 1, is_active: true, role: 'OWNER', username: 'testuser' };
      }
      return null;
    };

    // Store original ProductService methods
    originalGetAllProducts = ProductService.getAllProducts;
    originalSearchProducts = ProductService.searchProducts;
    originalGetProductById = ProductService.getProductById;
    originalCreateProduct = ProductService.createProduct;
    originalUpdateProduct = ProductService.updateProduct;
    originalUpdateProductStatus = ProductService.updateProductStatus;
  });

  after(() => {
    // Restore Prisma
    prisma.user.findUnique = originalFindUnique;

    // Restore ProductService
    ProductService.getAllProducts = originalGetAllProducts;
    ProductService.searchProducts = originalSearchProducts;
    ProductService.getProductById = originalGetProductById;
    ProductService.createProduct = originalCreateProduct;
    ProductService.updateProduct = originalUpdateProduct;
    ProductService.updateProductStatus = originalUpdateProductStatus;
  });

  describe('GET /api/v1/master/products', () => {
    it('should return a list of products', async () => {
      ProductService.getAllProducts = async () => ({
        data: [{ id: 1, name: 'Product A' }],
        total: 1,
        page: 1,
        limit: 10
      });

      const res = await request(app)
        .get('/api/v1/master/products')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array').with.lengthOf(1);
      expect(res.body.meta.total).to.equal(1);
    });
  });

  describe('GET /api/v1/master/products/search', () => {
    it('should search products', async () => {
      ProductService.searchProducts = async () => ([
        { id: 1, name: 'Product Search' }
      ]);

      const res = await request(app)
        .get('/api/v1/master/products/search?q=Search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array').with.lengthOf(1);
    });
  });

  describe('GET /api/v1/master/products/:id', () => {
    it('should return a single product by ID', async () => {
      ProductService.getProductById = async (id) => ({ id: Number(id), name: 'Product A' });

      const res = await request(app)
        .get('/api/v1/master/products/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.id).to.equal(1);
    });
    
    it('should return 404 if product not found', async () => {
      ProductService.getProductById = async () => { throw new Error('Product not found'); };

      const res = await request(app)
        .get('/api/v1/master/products/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(404);
      expect(res.body.success).to.be.false;
    });
  });

  describe('POST /api/v1/master/products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        name: 'New Product',
        category_id: 1,
        brand_id: 1,
        packaging_id: 1,
        unit_id: 1,
        cost_price: 10000,
        shelf_life: 12
      };

      ProductService.createProduct = async (data) => ({ id: 2, ...data });

      const res = await request(app)
        .post('/api/v1/master/products')
        .set('Authorization', `Bearer ${token}`)
        .send(newProduct);

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.id).to.equal(2);
      expect(res.body.data.name).to.equal('New Product');
    });

    it('should fail validation if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/master/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Incomplete Product' });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });
  });

  describe('PUT /api/v1/master/products/:id', () => {
    it('should update an existing product', async () => {
      const updateData = { name: 'Updated Product' };

      ProductService.updateProduct = async (id, data) => ({ id: Number(id), ...data });

      const res = await request(app)
        .put('/api/v1/master/products/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.name).to.equal('Updated Product');
    });
  });

  describe('PUT /api/v1/master/products/:id/status', () => {
    it('should update product status', async () => {
      ProductService.updateProductStatus = async (id, status) => ({ id: Number(id), is_active: status === 'ACTIVE' });

      const res = await request(app)
        .put('/api/v1/master/products/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.is_active).to.be.false;
    });
    
    it('should fail validation if status is invalid', async () => {
      const res = await request(app)
        .put('/api/v1/master/products/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'UNKNOWN' });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });
  });
});
