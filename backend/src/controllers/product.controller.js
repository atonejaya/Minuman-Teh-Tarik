const ProductService = require('../services/product.service');
const ResponseHelper = require('../helpers/response.helper');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

class ProductController {
  async create(req, res, next) {
    try {
      const validated = createProductSchema.parse(req.body);
      const product = await ProductService.create(validated, req.user.id);
      return ResponseHelper.created(res, product, 'Product created successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updateProductSchema.parse(req.body);
      const product = await ProductService.update(id, validated, req.user.id);
      return ResponseHelper.success(res, product, null, 'Product updated successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await ProductService.findById(id);
      return ResponseHelper.success(res, product, null, 'Product retrieved successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { page, limit, search, category, is_active, sort_by, sort_order } = req.query;
      
      const options = {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        search,
        category,
        is_active,
        sort_by,
        sort_order
      };

      const result = await ProductService.findAll(options);
      return ResponseHelper.success(res, result.data, result.meta, 'Products retrieved successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  async getActive(req, res, next) {
    try {
      req.query.is_active = 'true';
      return this.getAll(req, res, next);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await ProductService.softDelete(id, req.user.id);
      return ResponseHelper.success(res, product, null, 'Product deleted successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await ProductService.restore(id, req.user.id);
      return ResponseHelper.success(res, product, null, 'Product restored successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('lower than cost') || error.message.includes('already active') || error.message.includes('already inactive')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', error.message);
      }
      next(error);
    }
  }
}

module.exports = new ProductController();
