const ProductService = require('../services/ProductService');
const ProductValidator = require('../validators/ProductValidator');

class ProductController {
  async getAllProducts(req, res) {
    try {
      const result = await ProductService.getAllProducts(req.query);
      res.json({
        success: true,
        message: 'Products retrieved successfully',
        generated_at: new Date().toISOString(),
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async searchProducts(req, res) {
    try {
      const data = await ProductService.searchProducts(req.query);
      res.json({
        success: true,
        message: 'Products searched successfully',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProductById(req, res) {
    try {
      const data = await ProductService.getProductById(req.params.id);
      res.json({
        success: true,
        message: 'Product retrieved successfully',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async createProduct(req, res) {
    try {
      const { error, value } = ProductValidator.create.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      const data = await ProductService.createProduct(value, req.user?.id);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const { error, value } = ProductValidator.update.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      const data = await ProductService.updateProduct(req.params.id, value, req.user?.id);
      res.json({
        success: true,
        message: 'Product updated successfully',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateProductStatus(req, res) {
    try {
      const { error, value } = ProductValidator.updateStatus.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      const data = await ProductService.updateProductStatus(req.params.id, value.status, req.user?.id);
      res.json({
        success: true,
        message: 'Product status updated successfully',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ProductController();
