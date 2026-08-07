const prisma = require('../../../config/database');

class PiutangService {
  async syncAccountsReceivable(salesTransactionId) {
    return await prisma.$transaction(async (tx) => {
      const trx = await tx.salesTransaction.findUnique({
        where: { id: salesTransactionId }
      });

      if (!trx) return null;

      const outstanding = Number(trx.outstanding_amount || 0);
      
      // Calculate aging days
      let aging_days = 0;
      if (trx.due_date && outstanding > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(trx.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - dueDate.getTime();
        if (diffTime > 0) {
          aging_days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      const credit_limit = 10000000; // Example 10jt

      const data = {
        sales_transaction_id: trx.id,
        invoice_number: trx.code,
        customer_code: trx.customer_code,
        customer_name: trx.customer_name,
        invoice_amount: trx.grand_total,
        paid_amount: trx.paid_total,
        outstanding_amount: trx.outstanding_amount,
        due_date: trx.due_date,
        aging_days,
        status: trx.payment_status,
        last_invoice_date: new Date(), // Mocked for now
        credit_limit: credit_limit,
        available_credit: credit_limit - outstanding
      };

      const arProjection = await tx.accountsReceivableProjection.upsert({
        where: { sales_transaction_id: trx.id },
        update: data,
        create: data
      });

      // Calculate and upsert CustomerARProjection
      const customerInvoices = await tx.accountsReceivableProjection.findMany({
        where: { customer_code: trx.customer_code }
      });

      let total_invoice = 0;
      let total_outstanding = 0;
      let overdue_amount = 0;

      for (const inv of customerInvoices) {
        total_invoice += 1;
        total_outstanding += Number(inv.outstanding_amount || 0);
        if (inv.aging_days > 0) {
          overdue_amount += Number(inv.outstanding_amount || 0);
        }
      }

      const custData = {
        customer_code: trx.customer_code,
        customer_name: trx.customer_name,
        total_invoice,
        total_outstanding,
        overdue_amount,
        credit_limit: credit_limit,
        available_credit: credit_limit - total_outstanding,
        last_sync_at: new Date()
      };

      await tx.customerARProjection.upsert({
        where: { customer_code: trx.customer_code },
        update: custData,
        create: custData
      });

      return arProjection;
    });
  }

  async getDashboardMetrics() {
    const projections = await prisma.accountsReceivableProjection.findMany({
      where: { outstanding_amount: { gt: 0 } }
    });

    let piutang_hari_ini = 0;
    let piutang_jatuh_tempo = 0;
    let total_outstanding = 0;
    
    let bucket_belum_jatuh_tempo = 0;
    let bucket_1_30 = 0;
    let bucket_31_60 = 0;
    let bucket_61_90 = 0;
    let bucket_over_90 = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enhancedProjections = projections.map(p => {
      const outstanding = Number(p.outstanding_amount);
      const aging = p.aging_days || 0;
      
      // visit delay is assumed missing in schema so default to 0
      const visit_delay = p.visit_delay || 0; 
      
      let collection_priority_level = 'LOW';
      if (aging > 30 || outstanding > 5000000 || visit_delay > 14) {
        collection_priority_level = 'URGENT';
      } else if (aging > 15) {
        collection_priority_level = 'HIGH';
      } else if (aging > 0) {
        collection_priority_level = 'MEDIUM';
      }

      return {
        ...p,
        outstanding,
        visit_delay,
        collection_priority_level,
        priority_level: collection_priority_level
      };
    });

    for (const p of enhancedProjections) {
      const outstanding = p.outstanding;
      total_outstanding += outstanding;

      let isDueToday = false;
      if (p.due_date) {
        const dueDate = new Date(p.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate.getTime() === today.getTime()) {
          isDueToday = true;
          piutang_hari_ini += outstanding;
        }
      }

      if (p.aging_days === 0) {
        bucket_belum_jatuh_tempo += outstanding;
      } else if (p.aging_days >= 1 && p.aging_days <= 30) {
        bucket_1_30 += outstanding;
        piutang_jatuh_tempo += outstanding;
      } else if (p.aging_days >= 31 && p.aging_days <= 60) {
        bucket_31_60 += outstanding;
        piutang_jatuh_tempo += outstanding;
      } else if (p.aging_days >= 61 && p.aging_days <= 90) {
        bucket_61_90 += outstanding;
        piutang_jatuh_tempo += outstanding;
      } else if (p.aging_days > 90) {
        bucket_over_90 += outstanding;
        piutang_jatuh_tempo += outstanding;
      }
      p.isDueToday = isDueToday;
    }

    const top_piutang_terbesar = [...enhancedProjections].sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
    const top_terlama = [...enhancedProjections].sort((a, b) => (b.aging_days || 0) - (a.aging_days || 0)).slice(0, 10);
    const top_jatuh_tempo_hari_ini = enhancedProjections.filter(p => p.isDueToday).sort((a, b) => b.outstanding - a.outstanding).slice(0, 10);
    const top_belum_dikunjungi = [...enhancedProjections].sort((a, b) => b.visit_delay - a.visit_delay).slice(0, 10);

    return {
      global: {
        piutang_hari_ini,
        piutang_jatuh_tempo,
        total_outstanding,
        invoice_belum_lunas: projections.length,
        invoice_lewat_tempo: projections.filter(p => p.aging_days > 0).length
      },
      aging: {
        belum_jatuh_tempo: bucket_belum_jatuh_tempo,
        hari_1_30: bucket_1_30,
        hari_31_60: bucket_31_60,
        hari_61_90: bucket_61_90,
        hari_over_90: bucket_over_90
      },
      top_lists: {
        top_piutang_terbesar,
        top_terlama,
        top_jatuh_tempo_hari_ini,
        top_belum_dikunjungi
      }
    };
  }
}

module.exports = new PiutangService();
