class PaginationHelper {
  static getMeta(page, limit, total) {
    return {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      total: Number(total) || 0
    };
  }
}

module.exports = PaginationHelper;
