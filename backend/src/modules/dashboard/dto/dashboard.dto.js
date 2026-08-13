class DashboardDto {
  static formatResponse(data, message = 'Success', generatedAt = new Date()) {
    return {
      success: true,
      message,
      generated_at: generatedAt.toISOString(),
      data
    };
  }

  static formatOwnerSummary(data) {
    return {
      omzet: Number(data.omzet || 0),
      kas_masuk: Number(data.kas_masuk || 0),
      piutang: Number(data.piutang || 0),
      nilai_persediaan: Number(data.nilai_persediaan || 0),
      barang_direfill: Number(data.barang_direfill || 0)
    };
  }

  static formatOwnerProducts(data) {
    return {
      top_selling: data.top_selling || [],
      slow_moving: data.slow_moving || [],
      expiring_soon: data.expiring_soon || []
    };
  }

  static formatVisits(data) {
    return {
      completed: Number(data.completed || 0),
      planned: Number(data.planned || 0),
      total: Number(data.completed || 0) + Number(data.planned || 0)
    };
  }

  static formatSalesSummary(data) {
    return {
      omzet: Number(data.omzet || 0),
      kas_masuk: Number(data.kas_masuk || 0),
      barang_direfill: Number(data.barang_direfill || 0)
    };
  }

  static formatSalesInventory(data) {
    return {
      items: data.items || [],
      total_items: data.items ? data.items.length : 0
    };
  }
}

module.exports = DashboardDto;
