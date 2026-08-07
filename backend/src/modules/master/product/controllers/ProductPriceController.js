const ProductPriceService = require('../services/ProductPriceService');

class ProductPriceController {
  async getPricesByProductId(req, res, next) {
    try {
      const { id } = req.params;
      const prices = await ProductPriceService.getPricesByProductId(id);
      
      return res.status(200).json({
        success: true,
        message: 'Prices retrieved successfully',
        generated_at: new Date().toISOString(),
        data: prices
      });
    } catch (error) {
      next(error);
    }
  }

  async createPrice(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;
      const price = await ProductPriceService.createPrice(id, req.body, userId);
      
      return res.status(201).json({
        success: true,
        message: 'Price created successfully',
        generated_at: new Date().toISOString(),
        data: price
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePrice(req, res, next) {
    try {
      const { id, priceId } = req.params;
      const userId = req.user ? req.user.id : null;
      const price = await ProductPriceService.updatePrice(id, priceId, req.body, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Price updated successfully',
        generated_at: new Date().toISOString(),
        data: price
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePriceStatus(req, res, next) {
    try {
      const { id, priceId } = req.params;
      const { status } = req.body;
      const userId = req.user ? req.user.id : null;
      const price = await ProductPriceService.updatePriceStatus(id, priceId, status, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Price status updated successfully',
        generated_at: new Date().toISOString(),
        data: price
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductPriceController();
