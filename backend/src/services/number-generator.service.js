const prisma = require('../config/database');
const { InternalServerError } = require('../exceptions/api-error');

class NumberGeneratorService {
  /**
   * Generate a unique atomic code based on prefix and current date
   * @param {string} prefix - e.g., 'VIS', 'INV', 'RET'
   * @param {Date} [date] - date for formatting YYYYMMDD
   * @param {import('@prisma/client').PrismaClient} [tx] - optional prisma transaction client
   * @returns {Promise<string>}
   */
  async generateCode(prefix, date = new Date(), tx = prisma) {
    // Force Asia/Jakarta timezone for the code generation
    const jakartaTime = date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    const localDate = new Date(jakartaTime);

    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`; // YYYYMMDD

    const sequenceId = `${prefix}-${dateStr}`;

    try {
      // Upsert sequence using atomic increment
      const sequence = await tx.numberSequence.upsert({
        where: { id: sequenceId },
        update: {
          last_value: { increment: 1 }
        },
        create: {
          id: sequenceId,
          last_value: 1
        }
      });

      const paddedNumber = String(sequence.last_value).padStart(4, '0');
      return `${prefix}-${dateStr}-${paddedNumber}`;
    } catch (error) {
      console.error(`Failed to generate code for ${prefix}:`, error);
      throw new InternalServerError('NUMBER_GENERATION_FAILED', 'Failed to generate unique document number');
    }
  }
}

module.exports = new NumberGeneratorService();
