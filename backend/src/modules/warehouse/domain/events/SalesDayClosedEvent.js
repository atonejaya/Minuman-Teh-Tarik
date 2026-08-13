const DomainEvent = require('../../../../domain/events/DomainEvent');

/**
 * SalesDayClosedEvent (SPRINT 11.2A)
 * Dipublikasikan setelah SalesDay ditutup (status CLOSED) dengan
 * ringkasan harian transfer issue/return per produk untuk sales tsb.
 */
class SalesDayClosedEvent extends DomainEvent {
  constructor(salesDayId, payload, metadata = {}) {
    super(salesDayId, 'SalesDay', payload, metadata, 1);
  }
}

module.exports = SalesDayClosedEvent;
