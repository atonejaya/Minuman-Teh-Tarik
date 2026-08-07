'use strict';

/**
 * Status SalesDay (SPRINT 11.2A).
 * Mencerminkan enum "SalesDayStatus" pada database.
 *  - OPEN   : hari berjalan, transfer issue/return masih dapat berlangsung
 *  - CLOSED : ringkasan hari terkunci (checkpoint akhir hari sales)
 */
const SalesDayStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
};

module.exports = { SalesDayStatus };
