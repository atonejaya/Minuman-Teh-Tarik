const creditNoteService = require('../services/credit-note.service');
const ResponseHelper = require('../helpers/response.helper');
const DTOHelper = require('../helpers/dto.helper');

class CreditNoteController {
  async getCreditNotes(req, res, next) {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.warung_id) filters.warung_id = parseInt(req.query.warung_id, 10);

      const notes = await creditNoteService.getCreditNotes(filters);
      return ResponseHelper.success(res, notes.map(DTOHelper.toCreditNote), null, 'Credit Notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCreditNoteById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const note = await creditNoteService.getCreditNoteById(id);
      return ResponseHelper.success(res, DTOHelper.toCreditNote(note), null, 'Credit Note retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CreditNoteController();
