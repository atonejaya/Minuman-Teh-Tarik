const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository');
const AuditLogService = require('./audit-log.service');
const DTOHelper = require('../helpers/dto.helper');
const { ConflictError, NotFoundError } = require('../exceptions/api-error');

class UserService {
  async findAll(params) {
    const { data, total, page, limit } = await userRepository.findAll(params);
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: DTOHelper.toList(data, DTOHelper.toUser),
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_previous: page > 1,
      }
    };
  }

  async findById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', `User with ID ${id} not found`);
    }
    return DTOHelper.toUser(user);
  }

  async create(data, reqUser) {
    const existingUsername = await userRepository.exists({ username: data.username });
    if (existingUsername) {
      throw new ConflictError('USERNAME_ALREADY_EXISTS', 'Username already exists');
    }
    if (data.phone) {
      const existingPhone = await userRepository.exists({ phone: data.phone });
      if (existingPhone) {
        throw new ConflictError('PHONE_ALREADY_EXISTS', 'Phone already exists');
      }
    }

    const password_hash = await bcrypt.hash(data.password, 12);
    const { password, ...userData } = data;
    userData.password_hash = password_hash;

    const user = await userRepository.create(userData);
    await AuditLogService.log('CREATE USER', 'User', user.id, { username: user.username, role: user.role }, reqUser?.id);
    return DTOHelper.toUser(user);
  }

  async update(id, data, reqUser) {
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('USER_NOT_FOUND', `User with ID ${id} not found`);
    }
    if (data.phone) {
      const existing = await userRepository.findMany({ phone: data.phone, id: { not: Number(id) } });
      if (existing.length > 0) {
        throw new ConflictError('PHONE_ALREADY_EXISTS', 'Phone already exists');
      }
    }
    const user = await userRepository.update(id, data);
    await AuditLogService.log('UPDATE USER', 'User', user.id, data, reqUser?.id);
    return DTOHelper.toUser(user);
  }

  async updatePassword(id, password, reqUser) {
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('USER_NOT_FOUND', `User with ID ${id} not found`);
    }
    const password_hash = await bcrypt.hash(password, 12);
    const user = await userRepository.update(id, { password_hash });
    await AuditLogService.log('RESET PASSWORD', 'User', user.id, null, reqUser?.id);
    return DTOHelper.toUser(user);
  }

  async delete(id, reqUser) {
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('USER_NOT_FOUND', `User with ID ${id} not found`);
    }
    const user = await userRepository.softDelete(id);
    await AuditLogService.log('DELETE USER', 'User', user.id, null, reqUser?.id);
    return DTOHelper.toUser(user);
  }
}

module.exports = new UserService();
