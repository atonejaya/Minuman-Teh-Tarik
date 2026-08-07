const collectionService = require('../services/collection.service');
const ResponseHelper = require('../helpers/response.helper');
const DTOHelper = require('../helpers/dto.helper');

class CollectionController {
  async create(req, res) {
    try {
      const data = { ...req.body, sales_id: req.user.sub };
      const collection = await collectionService.createCollection(data, req.user.sub);
      return ResponseHelper.created(res, DTOHelper.toCollection(collection), 'Collection created');
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async addInvoice(req, res) {
    try {
      const { id } = req.params;
      const { transaction_id } = req.body;
      const item = await collectionService.addInvoice(parseInt(id), parseInt(transaction_id), req.user.sub);
      return ResponseHelper.created(res, DTOHelper.toCollectionItem(item), 'Invoice added to collection');
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async finish(req, res) {
    try {
      const { id } = req.params;
      const collection = await collectionService.finishCollection(parseInt(id), req.body, req.user.sub);
      return ResponseHelper.success(res, DTOHelper.toCollection(collection), null, 'Collection finished');
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const collection = await collectionService.getCollectionById(parseInt(id));
      return ResponseHelper.success(res, DTOHelper.toCollectionDetail(collection), null, 'Collection details retrieved');
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async getAll(req, res) {
    try {
      // Typically we'd call collectionService.getAll or collectionRepository.findMany
      // For now, let's use repository
      const repository = require('../repositories/collection.repository');
      const collections = await repository.findMany();
      return ResponseHelper.success(res, collections.map(DTOHelper.toCollection), null, 'Collections retrieved');
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }
}

module.exports = new CollectionController();
