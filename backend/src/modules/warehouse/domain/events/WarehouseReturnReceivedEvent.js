const DomainEvent = require('../../../../domain/events/DomainEvent');

/**
 * WarehouseReturnReceivedEvent (SPRINT 11.2A)
 * Dipublikasikan setelah transfer RETURN (Sales -> Warehouse) berhasil
 * diposting: WarehouseStock bertambah + SalesStock berkurang. Payload
 * memuat identitas transfer dan mutasi per produk.
 */
class WarehouseReturnReceivedEvent extends DomainEvent {
  constructor(transferId, payload, metadata = {}) {
    super(transferId, 'WarehouseTransfer', payload, metadata, 1);
  }
}

module.exports = WarehouseReturnReceivedEvent;
