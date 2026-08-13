const DomainEvent = require('../../../../domain/events/DomainEvent');

/**
 * WarehouseTransferPostedEvent (SPRINT 11.2A)
 * Dipublikasikan setelah transfer ISSUE (Warehouse -> Sales) berhasil
 * diposting: WarehouseLedger + WarehouseStock berkurang + SalesStock
 * bertambah. Payload memuat identitas transfer dan mutasi per produk.
 */
class WarehouseTransferPostedEvent extends DomainEvent {
  constructor(transferId, payload, metadata = {}) {
    super(transferId, 'WarehouseTransfer', payload, metadata, 1);
  }
}

module.exports = WarehouseTransferPostedEvent;
