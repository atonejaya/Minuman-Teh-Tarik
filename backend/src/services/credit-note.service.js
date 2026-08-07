const creditNoteRepository = require('../repositories/credit-note.repository');
const auditLogService = require('./audit-log.service');
const numberGeneratorService = require('./number-generator.service');
const { ConflictError, NotFoundError, BadRequestError } = require('../exceptions/api-error');

class CreditNoteService {
  /**
   * Internal use only. Called when a Return is confirmed.
   */
  async createCreditNote(warungId, salesReturnId, amount, tx) {
    if (amount <= 0) {
      throw new Error('Credit Note amount must be greater than 0');
    }

    const code = await numberGeneratorService.generateCode('CRN', new Date(), tx);

    const creditNote = await creditNoteRepository.create({
      code,
      warung_id: warungId,
      sales_return_id: salesReturnId,
      amount,
      remaining_amount: amount,
      status: 'ACTIVE'
    }, tx);

    await auditLogService.log(
      'CREATE_CREDIT_NOTE',
      'CreditNote',
      creditNote.id,
      { code, amount, remaining_amount: amount },
      null,
      tx
    );

    return creditNote;
  }

  async useCreditNote(id, amountToUse, referenceId, userId, tx) {
    const creditNote = await creditNoteRepository.findById(id, tx);
    if (!creditNote) {
      throw new NotFoundError('NOT_FOUND', 'Credit Note not found');
    }

    if (creditNote.status !== 'ACTIVE') {
      throw new ConflictError('CONFLICT', 'Credit Note is not active');
    }

    if (Number(creditNote.remaining_amount) < amountToUse) {
      throw new ConflictError('CONFLICT', 'Credit Note remaining amount is insufficient');
    }

    const newRemainingAmount = Number(creditNote.remaining_amount) - amountToUse;
    const status = newRemainingAmount === 0 ? 'USED' : 'ACTIVE';

    const updated = await creditNoteRepository.update(id, {
      remaining_amount: newRemainingAmount,
      status
    }, tx);

    await auditLogService.log(
      'USE_CREDIT_NOTE',
      'CreditNote',
      id,
      { 
        amount_used: amountToUse, 
        remaining_amount_before: creditNote.remaining_amount, 
        remaining_amount_after: newRemainingAmount,
        reference_id: referenceId
      },
      userId,
      tx
    );

    return updated;
  }

  async getCreditNotes(filters = {}) {
    return creditNoteRepository.findMany(filters);
  }

  async getCreditNoteById(id) {
    const creditNote = await creditNoteRepository.findById(id);
    if (!creditNote) {
      throw new NotFoundError('NOT_FOUND', 'Credit Note not found');
    }
    return creditNote;
  }
}

module.exports = new CreditNoteService();
