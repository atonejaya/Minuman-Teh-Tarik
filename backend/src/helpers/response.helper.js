const { ApiError } = require('../exceptions/api-error');

class ResponseHelper {
  static success(res, data = {}, meta = null, message = 'Success') {
    const response = { success: true, message, request_id: res.locals.requestId, data };
    if (meta) response.meta = meta;
    return res.status(200).json(response);
  }
  
  static created(res, data = {}, message = 'Created') {
    return res.status(201).json({ success: true, message, request_id: res.locals.requestId, data });
  }
  
  static error(res, err) {
    if (err instanceof ApiError) {
      const response = { success: false, code: err.code, message: err.message, request_id: res.locals.requestId };
      if (err.errors) response.errors = err.errors;
      return res.status(err.status).json(response);
    }
    
    // Fallback for unhandled errors
    console.error(err);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal Server Error',
      request_id: res.locals.requestId
    });
  }

  static badRequest(res, code = 'BAD_REQUEST', message = 'Validation Error', errors = null) {
    const response = { success: false, code, message, request_id: res.locals.requestId };
    if (errors) response.errors = errors;
    return res.status(400).json(response);
  }
  
  static unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message, request_id: res.locals.requestId });
  }
  
  static forbidden(res, message = 'Forbidden') {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message, request_id: res.locals.requestId });
  }
  
  static notFound(res, code = 'NOT_FOUND', message = 'Not Found') {
    return res.status(404).json({ success: false, code, message, request_id: res.locals.requestId });
  }
  
  static internalServerError(res, message = 'Internal Server Error') {
    return res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message, request_id: res.locals.requestId });
  }
}

module.exports = ResponseHelper;
