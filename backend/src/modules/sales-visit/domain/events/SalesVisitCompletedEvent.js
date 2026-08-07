'use strict';

const DomainEvent = require('../../../../domain/events/DomainEvent');

class SalesVisitCompletedEvent extends DomainEvent {
  constructor(visitId, payload, metadata = {}) {
    super(visitId, 'SalesVisit', payload, metadata, 1);
  }
}

module.exports = SalesVisitCompletedEvent;
