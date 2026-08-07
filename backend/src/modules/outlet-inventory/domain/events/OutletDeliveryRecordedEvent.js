const DomainEvent = require('../../../../domain/events/DomainEvent');

/**
 * OutletDeliveryRecordedEvent (SPRINT 11.1A)
 * Dipublikasikan setelah delivery berhasil diposting ke Outlet Stock
 * (ledger + projection). Payload memuat identitas delivery, outlet,
 * referensi kunjungan (bila reference_type = SALES_VISIT), items, dan
 * timestamp.
 */
class OutletDeliveryRecordedEvent extends DomainEvent {
  constructor(deliveryId, payload, metadata = {}) {
    super(deliveryId, 'OutletInventory', payload, metadata, 1);
  }
}

module.exports = OutletDeliveryRecordedEvent;
