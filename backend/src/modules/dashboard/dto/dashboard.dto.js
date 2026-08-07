class DashboardDto {
  static formatResponse(data, message = 'Success') {
    return {
      success: true,
      message,
      generated_at: new Date().toISOString(),
      data
    };
  }

  static formatSummary(data) {
    return {
      omzet_hari_ini: Number(data.omzet_hari_ini || 0),
      omzet_bulan_berjalan: Number(data.omzet_bulan_berjalan || 0),
      total_invoice_hari_ini: Number(data.total_invoice_hari_ini || 0),
      invoice_belum_lunas: Number(data.invoice_belum_lunas || 0),
      total_piutang: Number(data.total_piutang || 0),
      total_credit_note: Number(data.total_credit_note || 0),
      customer_aktif: Number(data.customer_aktif || 0),
      produk_terjual_hari_ini: Number(data.produk_terjual_hari_ini || 0),
      top_selling_product: data.top_selling_product || null,
      last_synchronization_time: data.last_synchronization_time || new Date().toISOString()
    };
  }

  static formatSalesAnalytics(data) {
    return {
      daily_sales_trend: data.daily_sales_trend || [],
      weekly_sales_trend: data.weekly_sales_trend || [],
      monthly_sales_trend: data.monthly_sales_trend || [],
      invoice_trend: data.invoice_trend || [],
      payment_trend: data.payment_trend || [],
      average_transaction_value: Number(data.average_transaction_value || 0)
    };
  }

  static formatProductAnalytics(data) {
    return {
      top_10_product: data.top_10_product || [],
      slow_moving_product: data.slow_moving_product || [],
      revenue_per_product: data.revenue_per_product || [],
      qty_sold: Number(data.qty_sold || 0),
      average_selling_price: Number(data.average_selling_price || 0)
    };
  }

  static formatCustomerAnalytics(data) {
    return {
      top_customer: data.top_customer || [],
      outstanding_customer: data.outstanding_customer || [],
      customer_purchase_frequency: data.customer_purchase_frequency || [],
      new_customer: Number(data.new_customer || 0),
      active_customer: Number(data.active_customer || 0)
    };
  }

  static formatReceivableAnalytics(data) {
    return {
      total_outstanding: Number(data.total_outstanding || 0),
      aging_receivable: data.aging_receivable || [],
      collection_rate: Number(data.collection_rate || 0),
      credit_note_summary: Number(data.credit_note_summary || 0),
      outstanding_by_customer: data.outstanding_by_customer || []
    };
  }
}

module.exports = DashboardDto;
