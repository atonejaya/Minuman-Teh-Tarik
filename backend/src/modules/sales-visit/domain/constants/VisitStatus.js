'use strict';

/**
 * SalesVisit lifecycle statuses (SPRINT 11.0E).
 * Mencerminkan enum "SalesVisitStatus" pada database.
 */
const VisitStatus = {
  PLANNED: 'PLANNED',
  CHECKED_IN: 'CHECKED_IN',
  STOCK_COUNTED: 'STOCK_COUNTED',
  ORDER_CREATED: 'ORDER_CREATED',
  DELIVERED: 'DELIVERED',
  CHECKED_OUT: 'CHECKED_OUT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

/**
 * Transition table (source -> allowed target statuses).
 * PLANNED -> CHECKED_IN -> STOCK_COUNTED / ORDER_CREATED / DELIVERED / CHECKED_OUT
 *            -> CHECKED_OUT -> COMPLETED
 * CANCELLED hanya dapat dilakukan sebelum ada aktivitas lapangan (PLANNED).
 */
const VisitTransitions = {
  [VisitStatus.PLANNED]: [VisitStatus.CHECKED_IN, VisitStatus.CANCELLED],
  [VisitStatus.CHECKED_IN]: [VisitStatus.STOCK_COUNTED, VisitStatus.ORDER_CREATED, VisitStatus.DELIVERED, VisitStatus.CHECKED_OUT],
  [VisitStatus.STOCK_COUNTED]: [VisitStatus.ORDER_CREATED, VisitStatus.DELIVERED, VisitStatus.CHECKED_OUT],
  [VisitStatus.ORDER_CREATED]: [VisitStatus.DELIVERED, VisitStatus.CHECKED_OUT],
  [VisitStatus.DELIVERED]: [VisitStatus.CHECKED_OUT],
  [VisitStatus.CHECKED_OUT]: [VisitStatus.COMPLETED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: []
};

const TERMINAL_STATUSES = [VisitStatus.COMPLETED, VisitStatus.CANCELLED];

module.exports = { VisitStatus, VisitTransitions, TERMINAL_STATUSES };
