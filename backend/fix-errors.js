const fs = require('fs');

function fixFile(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/new NotFoundError\('/g, 'new NotFoundError(\'NOT_FOUND\', \'');
  c = c.replace(/new ConflictError\('/g, 'new ConflictError(\'CONFLICT\', \'');
  c = c.replace(/new BadRequestError\('/g, 'new BadRequestError(\'BAD_REQUEST\', \'');
  fs.writeFileSync(file, c);
}

fixFile('src/services/sales-return.service.js');
fixFile('src/services/credit-note.service.js');
