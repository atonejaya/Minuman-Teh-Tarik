class ApiError extends Error {
  constructor(status, code, message, errors = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(code = 'BAD_REQUEST', message = 'Bad Request', errors = null) {
    super(400, code, message, errors);
  }
}

class UnauthorizedError extends ApiError {
  constructor(code = 'UNAUTHORIZED', message = 'Unauthorized') {
    super(401, code, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(code = 'FORBIDDEN', message = 'Forbidden') {
    super(403, code, message);
  }
}

class NotFoundError extends ApiError {
  constructor(code = 'NOT_FOUND', message = 'Not Found') {
    super(404, code, message);
  }
}

class ConflictError extends ApiError {
  constructor(code = 'CONFLICT', message = 'Conflict') {
    super(409, code, message);
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Validation Error', errors = null) {
    super(422, 'VALIDATION_ERROR', message, errors);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError
};
