'use strict';

const DomainEvent = require('../../../../domain/events/DomainEvent');

class SalesReturnApprovedEvent extends DomainEvent {
  constructor(returnId, payload, metadata = {}) {
    super(returnId, 'SalesReturn', payload, metadata, 1);
  }
}

module.exports = SalesReturnApprovedEvent;
