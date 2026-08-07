const prisma = require('../../../../config/database');
const ResponseHelper = require('../../../../helpers/response.helper');

class MasterLookupController {
  async getAllLookups(req, res, next) {
    try {
      const [
        categories,
        brands,
        units,
        packagings,
        suppliers,
        warehouses,
        priceLevels,
        taxes,
        customerCategories,
        areas,
        routes,
        regionals,
        salesmen
      ] = await Promise.all([
        prisma.productCategory.findMany({ where: { status: 'ACTIVE' } }),
        prisma.brand.findMany({ where: { status: 'ACTIVE' } }),
        prisma.unit.findMany({ where: { status: 'ACTIVE' } }),
        prisma.packaging.findMany({ where: { status: 'ACTIVE' } }),
        prisma.supplier.findMany({ where: { status: 'ACTIVE' } }),
        prisma.warehouse.findMany({ where: { is_active: true } }),
        prisma.priceLevel.findMany({ where: { status: 'ACTIVE' }, orderBy: { priority: 'asc' } }),
        prisma.tax.findMany({ where: { status: 'ACTIVE' } }),
        prisma.customerCategory.findMany({ where: { is_active: true } }),
        prisma.area.findMany({ where: { is_active: true } }),
        prisma.route.findMany({ where: { is_active: true } }),
        prisma.regional.findMany({ where: { is_active: true } }),
        prisma.user.findMany({ where: { role: 'SALES' } })
      ]);

      const paymentTerms = [0, 7, 14, 30];
      const visitDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

      return ResponseHelper.success(res, {
        categories,
        brands,
        units,
        packagings,
        suppliers,
        warehouses,
        priceLevels,
        taxes,
        customerCategories,
        areas,
        routes,
        regionals,
        salesmen,
        paymentTerms,
        visitDays
      }, null, 'Successfully fetched all master lookups');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MasterLookupController();
