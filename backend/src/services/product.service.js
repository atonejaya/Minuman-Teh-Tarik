const ProductRepository = require('../repositories/product.repository');
const AuditLogService = require('./audit-log.service');
const ResponseHelper = require('../helpers/response.helper');
const DTOHelper = require('../helpers/dto.helper');
const { ConflictError, NotFoundError, BadRequestError } = require('../exceptions/api-error');

class ProductService {
  async create(data, actorId) {
    if (data.selling_price < data.cost_price) {
      throw new BadRequestError('INVALID_PRICE', 'Selling price cannot be lower than cost price');
    }

    const codeExists = await ProductRepository.existsByCode(data.code);
    if (codeExists) {
      throw new ConflictError('PRODUCT_CODE_EXISTS', `Product code ${data.code} already exists`);
    }

    const nameExists = await ProductRepository.existsByName(data.name);
    if (nameExists) {
      throw new ConflictError('PRODUCT_NAME_EXISTS', `Product name ${data.name} already exists`);
    }

    const product = await ProductRepository.create(data);

    await AuditLogService.log(
      'CREATE',
      'Product',
      product.id,
      { new_value: product },
      actorId
    );

    return DTOHelper.toProduct(product);
  }

  async update(id, data, actorId) {
    const existing = await ProductRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Product with ID ${id} not found`);
    }

    const newSelling = data.selling_price !== undefined ? data.selling_price : existing.selling_price;
    const newCost = data.cost_price !== undefined ? data.cost_price : existing.cost_price;

    if (Number(newSelling) < Number(newCost)) {
      throw new BadRequestError('INVALID_PRICE', 'Selling price cannot be lower than cost price');
    }

    if (data.code) {
      const codeExists = await ProductRepository.existsByCode(data.code, id);
      if (codeExists) {
        throw new ConflictError('PRODUCT_CODE_EXISTS', `Product code ${data.code} already exists`);
      }
    }

    if (data.name) {
      const nameExists = await ProductRepository.existsByName(data.name, id);
      if (nameExists) {
        throw new ConflictError('PRODUCT_NAME_EXISTS', `Product name ${data.name} already exists`);
      }
    }

    const product = await ProductRepository.update(id, data);

    await AuditLogService.log(
      'UPDATE',
      'Product',
      product.id,
      { old_value: existing, new_value: product },
      actorId
    );

    return DTOHelper.toProduct(product);
  }

  async findById(id) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Product with ID ${id} not found`);
    }
    return DTOHelper.toProduct(product);
  }

  async findAll(options = {}) {
    const result = await ProductRepository.findAll(options);
    return {
      data: DTOHelper.toList(result.data, DTOHelper.toProduct),
      meta: result.meta
    };
  }

  async softDelete(id, actorId) {
    const existing = await ProductRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Product with ID ${id} not found`);
    }

    if (!existing.is_active) {
      throw new BadRequestError('PRODUCT_ALREADY_INACTIVE', `Product is already inactive`);
    }

    const product = await ProductRepository.softDelete(id);

    await AuditLogService.log(
      'DELETE',
      'Product',
      product.id,
      { old_value: { is_active: existing.is_active }, new_value: { is_active: false } },
      actorId
    );

    return DTOHelper.toProduct(product);
  }

  async restore(id, actorId) {
    const existing = await ProductRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', `Product with ID ${id} not found`);
    }

    if (existing.is_active) {
      throw new BadRequestError('PRODUCT_ALREADY_ACTIVE', `Product is already active`);
    }

    const product = await ProductRepository.restore(id);

    await AuditLogService.log(
      'RESTORE',
      'Product',
      product.id,
      { old_value: { is_active: existing.is_active }, new_value: { is_active: true } },
      actorId
    );

    return DTOHelper.toProduct(product);
  }
}

module.exports = new ProductService();
