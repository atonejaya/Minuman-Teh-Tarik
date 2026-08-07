const userService = require('../services/user.service');
const { createUserSchema, updateUserSchema, updatePasswordSchema } = require('../validators/user.validator');
const ResponseHelper = require('../helpers/response.helper');

class UserController {
  static async getAll(req, res, next) {
    try {
      const { page, limit, search, sort, order, include_inactive } = req.query;
      
      const sortWhitelist = ['name', 'username', 'created_at', 'updated_at'];
      const validSort = sortWhitelist.includes(sort) ? sort : 'created_at';
      const validOrder = order === 'asc' ? 'asc' : 'desc';

      const result = await userService.findAll({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search,
        sort: validSort,
        order: validOrder,
        includeInactive: include_inactive === 'true',
      });
      return ResponseHelper.success(res, result.data, result.meta, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      if (!user) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', 'User not found');
      }
      return ResponseHelper.success(res, user, null, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const validated = createUserSchema.parse(req.body);
      const user = await userService.create(validated, req.user);
      return ResponseHelper.created(res, user, 'User created successfully');
    } catch (error) {
      if (error.message === 'Username already exists' || error.message === 'Phone already exists') {
         return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const user = await userService.update(req.params.id, validated, req.user);
      return ResponseHelper.success(res, user, null, 'User updated successfully');
    } catch (error) {
       if (error.message === 'Phone already exists') {
         return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  static async updatePassword(req, res, next) {
    try {
      const validated = updatePasswordSchema.parse(req.body);
      const user = await userService.updatePassword(req.params.id, validated.password, req.user);
      return ResponseHelper.success(res, user, null, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const user = await userService.delete(req.params.id, req.user);
      return ResponseHelper.success(res, user, null, 'User deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
