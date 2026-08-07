const { PrismaClient } = require('@prisma/client');
const prisma = require('../config/database');

/**
 * Outbox Repository
 * Handles database operations for Transactional Outbox.
 * Note: Never instantiate PrismaClient here, use the injected `tx` (transaction) or global `prisma`.
 */
class OutboxRepository {
  /**
   * Insert a DomainEvent into the outbox within a transaction.
   * @param {DomainEvent} event
   * @param {import('@prisma/client').Prisma.TransactionClient} tx
   */
  async insert(event, tx) {
    if (!tx) {
      throw new Error('Transaction object (tx) is required for OutboxRepository.insert');
    }

    return tx.outboxEvent.create({
      data: {
        id: event.eventId,
        event_name: event.eventName,
        aggregate_id: event.aggregateId.toString(),
        aggregate_type: event.aggregateType,
        event_version: event.version,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        payload: event.payload,
        metadata: event.metadata,
        status: 'PENDING',
        occurred_at: new Date(event.occurredAt),
      },
    });
  }

  /**
   * Finds pending events that are ready to be published or retried.
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async findPending(limit = 100) {
    const now = new Date();
    
    // We look for PENDING events, OR FAILED/PROCESSING events that are ready for a retry
    // Wait, the spec says FAILED -> next_retry_at is calculated.
    return prisma.outboxEvent.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          {
            status: 'FAILED',
            next_retry_at: { lte: now }
          },
          {
            status: 'PROCESSING',
            processing_started_at: { lte: new Date(now.getTime() - 30 * 60 * 1000) } // stuck for > 30 mins
          }
        ]
      },
      orderBy: { created_at: 'asc' },
      take: limit
    });
  }

  /**
   * Mark a batch of events as PROCESSING atomically.
   * @param {Array<string>} ids 
   * @returns {Promise<void>}
   */
  async markProcessingBatch(ids) {
    if (!ids || ids.length === 0) return;
    
    await prisma.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'PROCESSING',
        processing_started_at: new Date()
      }
    });
  }

  /**
   * Mark an event as PUBLISHED.
   * @param {string} id 
   * @param {string} workerId 
   */
  async markPublished(id, workerId = 'system') {
    return prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        published_at: new Date(),
        published_by: workerId
      }
    });
  }

  /**
   * Mark an event as FAILED, increment retry_count, set next_retry_at.
   * @param {string} id 
   * @param {string} errorMessage 
   * @param {number} retryDelayMs 
   * @param {number} maxRetry
   */
  async markFailed(id, errorMessage, retryDelayMs = 5000, maxRetry = 3) {
    const event = await prisma.outboxEvent.findUnique({ where: { id } });
    if (!event) return;

    const newRetryCount = event.retry_count + 1;
    let nextRetryAt = new Date(Date.now() + retryDelayMs * Math.pow(2, event.retry_count)); // Exponential backoff
    
    // If max retries reached, do not schedule another retry (set to null)
    if (newRetryCount >= maxRetry) {
      nextRetryAt = null;
    }

    return prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        error_message: errorMessage,
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt
      }
    });
  }
}

module.exports = new OutboxRepository();
