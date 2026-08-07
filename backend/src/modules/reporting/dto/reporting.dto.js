class ReportingDto {
  static formatDailySales(row) {
    return {
      date: row.date.toISOString().split('T')[0],
      sales_id: row.sales_id,
      warehouse_id: row.warehouse_id,
      invoice_count: row.invoice_count,
      sales_amount: Number(row.sales_amount),
      paid_amount: Number(row.paid_amount),
      outstanding_amount: Number(row.outstanding_amount),
      return_amount: Number(row.return_amount),
      settlement_amount: Number(row.settlement_amount),
    };
  }

  static formatCustomerLedger(row) {
    return {
      customer_id: row.customer_id,
      receivable: Number(row.receivable),
      credit_note: Number(row.credit_note),
      paid: Number(row.paid),
      outstanding: Number(row.receivable) - Number(row.paid) - Number(row.credit_note),
      last_transaction_date: row.last_transaction_date ? row.last_transaction_date.toISOString() : null,
    };
  }

  static formatProductSales(row) {
    return {
      product_id: row.product_id,
      sales_qty: row.sales_qty,
      return_qty: row.return_qty,
      net_sales_qty: row.net_sales_qty,
      sales_value: Number(row.sales_value),
    };
  }

  static formatSalesPerformance(row) {
    return {
      sales_id: row.sales_id,
      total_customer: row.total_customer,
      total_invoice: row.total_invoice,
      total_sales: Number(row.total_sales),
      total_collection: Number(row.total_collection),
      total_return: Number(row.total_return),
      total_settlement: Number(row.total_settlement),
    };
  }

  static formatResponse(data, summary, pagination) {
    return {
      data,
      summary,
      pagination
    };
  }
}

module.exports = ReportingDto;
