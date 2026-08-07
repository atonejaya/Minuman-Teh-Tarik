const EventSubscriber = require('../../infrastructure/events/subscribers/EventSubscriber');
const prisma = require('../../config/database');

/**
 * Base class for all CQRS Projectors.
 * Provides built-in idempotency by tracking processed events.
 */
class BaseProjector extends EventSubscriber {
  constructor() {
    super();
    if (new.target === BaseProjector) {
      throw new TypeError("Cannot construct BaseProjector instances directly");
    }
  }

  /**
   * Process an event idempotently within a transaction.
   * Projectors should implement `project(event, tx)` instead of `handle(event)`.
   * @param {DomainEvent} event 
   */
  async handle(event) {
    const projectorName = this.constructor.name;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Idempotency Check
        const existing = await tx.processedEvent.findUnique({
          where: {
            event_id_projector_name: {
              event_id: event.eventId,
              projector_name: projectorName
            }
          }
        });

        if (existing) {
          // Event already processed by this projector, skip gracefully
          console.log(`[${projectorName}] Event ${event.eventId} already processed. Skipping.`);
          return;
        }

        // 2. Execute Projection Logic
        await this.project(event, tx);

        // 3. Mark as Processed
        await tx.processedEvent.create({
          data: {
            event_id: event.eventId,
            projector_name: projectorName,
            processed_at: new Date()
          }
        });
      });
      console.log(`[${projectorName}] Successfully processed event ${event.eventId}`);
    } catch (error) {
      console.error(`[${projectorName}] Failed to process event ${event.eventId}:`, error);
      throw error; // Rethrow to let the caller (Worker/Bus) handle it
    }
  }

  /**
   * Abstract method to be implemented by child classes.
   * @param {DomainEvent} event 
   * @param {import('@prisma/client').Prisma.TransactionClient} tx 
   */
  async project(event, tx) {
    throw new Error('Method not implemented.');
  }
}

module.exports = BaseProjector;
