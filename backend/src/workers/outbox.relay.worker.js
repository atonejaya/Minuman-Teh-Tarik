const outboxRepository = require('../repositories/outbox.repository');
const EventFactory = require('../infrastructure/events/factory/EventFactory');

/**
 * Outbox Relay Worker
 * Polls the OutboxEvent table and publishes pending events to the Message Bus.
 * Supports batch processing and retry mechanism.
 */
class OutboxRelayWorker {
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;
    this.maxRetry = Number(options.maxRetry || process.env.OUTBOX_MAX_RETRY || 3);
    this.pollInterval = Number(options.pollInterval || process.env.OUTBOX_POLL_INTERVAL_MS || 5000);
    this.batchSize = Number(options.batchSize || process.env.OUTBOX_BATCH_SIZE || 100);
    this.retryDelay = Number(options.retryDelay || process.env.OUTBOX_RETRY_DELAY_MS || 5000);
    this.workerId = `worker-${Math.floor(Math.random() * 10000)}`;
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => this.processOutbox(), this.pollInterval);
    console.info(`[OutboxRelayWorker:${this.workerId}] Started with poll interval ${this.pollInterval}ms`);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.info(`[OutboxRelayWorker:${this.workerId}] Stopped`);
  }

  async processOutbox() {
    try {
      const records = await outboxRepository.findPending(this.batchSize);
      if (records.length === 0) return;

      // Batch convert to PROCESSING to prevent other workers from picking them up
      const recordIds = records.map(r => r.id);
      await outboxRepository.markProcessingBatch(recordIds);

      // Process each record sequentially (or we could use Promise.all)
      for (const record of records) {
        await this.processRecord(record);
      }
    } catch (error) {
      console.error(`[OutboxRelayWorker:${this.workerId}] Global error during batch processing:`, error);
    }
  }

  async processRecord(record) {
    console.info(JSON.stringify({
      type: 'OUTBOX_PROCESSING',
      eventName: record.event_name,
      aggregateId: record.aggregate_id,
      correlationId: record.correlation_id,
      retryCount: record.retry_count,
      workerId: this.workerId,
      timestamp: new Date().toISOString()
    }));

    try {
      // Reconstruct Domain Event
      const event = EventFactory.fromOutbox(record);

      // Publish to Message Bus
      await this.eventBus.publish(event);

      // Mark as PUBLISHED
      await outboxRepository.markPublished(record.id, this.workerId);

      console.info(JSON.stringify({
        type: 'OUTBOX_PUBLISHED',
        eventName: record.event_name,
        aggregateId: record.aggregate_id,
        correlationId: record.correlation_id,
        workerId: this.workerId,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      await outboxRepository.markFailed(record.id, error.message, this.retryDelay, this.maxRetry);
      
      console.error(JSON.stringify({
        type: 'OUTBOX_FAILED',
        eventName: record.event_name,
        aggregateId: record.aggregate_id,
        correlationId: record.correlation_id,
        retryCount: record.retry_count,
        workerId: this.workerId,
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  }
}

module.exports = OutboxRelayWorker;
